import { Client, codeBlock, DMChannel, GatewayIntentBits, Guild, GuildMember, GuildScheduledEventStatus, WebhookClient } from 'discord.js'
import { Command, getCommandFunction, usableInDM } from './commands'
import guildSetting from './guildSetting'
import { goodbye, welcome } from './welcome'
import openAPIServer from './api'
import { addGuildChannel, removeGuildChannel, modifyGuildChannel } from './utils/channel'
import { addSlashCommands, deferReply, errorMessage, getCurrentDate, getCurrentTime, getHours } from './utils/default'
import { getChannel, getGuildOwner } from './utils/discord'
import { addOrUpdateGuildData, getGuildData, removeGuildData } from './utils/guildData'
import { addMemberData, removeMemberData, updateMemberData } from './utils/memberData'
import { addMod, hasModRole, removeMod } from './utils/mod'
import { addBan, removeBan } from './utils/ban'
import { getGuildOption } from './utils/guildOption'
import { someoneHasBan, someoneHasUnban } from './commands/ban'
import { addGuildRole, getGuildRole } from './utils/role'
import { log, logTypeAutoComplete } from './utils/log'
import { addMemberExp, checkLevelUp } from './utils/level'
import { coinNameAutoComplete, ownedCoinAutoComplete } from './utils/coin'
import coinGame from './coin/coin'
import { addUserData, getUserData, updateUserData } from './utils/userData'
import { scanMessage } from './utils/blockword'
import { KoreanbotsClient } from 'koreanbots'
import { removeGuildRole } from './utils/role'
import { modifyGuildRole } from './utils/role'
import { env } from './lib'
import startCronJobs from './cronjobs/main'
import { addTodayChannelMessagesPerHour, addTodayGuildMessagesPerHour, addTodayMemberMessagesPerHour, updateTodayBotStatistics, updateTodayChannelStatistics, updateTodayGuildStatistics, updateTodayMemberStatistics } from './utils/statistics'
import adminCommand from './utils/admin/command'

const clientIntents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessageTyping,
]
const KOREAN_TOKEN = env.KOREAN_TOKEN
export let client = new Client({ intents: clientIntents }) as KoreanbotsClient
export const webhookAlert = new WebhookClient({ url: env.WEBHOOK_URL })

if(env.NODE_ENV === 'production'){
    client = new KoreanbotsClient({ 
        intents: clientIntents,
        koreanbots: {
            api: {
                token: KOREAN_TOKEN!
            }
        },
        koreanbotsClient: {
            updateInterval: 600000 //10????????? ?????? ?????? ?????????????????????. (????????? 30???)
        }
    })
}

client.on('ready', async () => {
	console.log(`Logged in as ${client.user?.tag}!`)
    console.log(`Version: ${env.VERSION} / Build: ${env.BUILD_DATE}`)
    console.log(`Mode : ${env.NODE_ENV}`)
    openAPIServer()
    coinGame()
    startCronJobs()

    await addSlashCommands()
})

client.on('messageCreate', async message => {
    try {
        if (!message.guild || message.webhookId || !message.member || message.author.bot) return
        if (!message.channel || message.channel.isDMBased()) return
        
        adminCommand(message)

        const guildData = await getGuildData(message.guild.id)
        if (!guildData) await addOrUpdateGuildData(message.guild)

        const guildId = message.guild.id

        await updateTodayGuildStatistics(guildId, 'todayMessages', prev => prev + 1)
        await updateTodayChannelStatistics(guildId, message.channel.id, 'todayMessages', prev => prev + 1)
        await updateTodayMemberStatistics(guildId, message.member.id, 'todayMessages', prev => prev + 1)
        
        await addTodayGuildMessagesPerHour(guildId, getHours())
        await addTodayChannelMessagesPerHour(guildId, message.channel.id, getHours())
        await addTodayMemberMessagesPerHour(guildId, message.member.id, getHours())

        await scanMessage(message)

        await addMemberExp(message.member!, 10)
        await checkLevelUp(message.member!, message.channel)

        const exist = await getUserData(message.author.id)
        if (!exist) await addUserData(message.author.id)
    } catch { return }
})

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        switch (interaction.commandName) {
            case '????????????': { await coinNameAutoComplete(interaction); break }
            case '????????????': { await coinNameAutoComplete(interaction); break }
            case '????????????': { await ownedCoinAutoComplete(interaction); break }
            case '????????????': { await coinNameAutoComplete(interaction); break }
            case '??????': { await logTypeAutoComplete(interaction); break }
        }
        return
    }
    else if (interaction.isChatInputCommand()) {
        await updateTodayBotStatistics('todayUsedCommand', prev => prev + 1)
        await deferReply(interaction)
        if (usableInDM.includes(interaction.commandName as Command) && interaction.channel === null) {
            try {
                return getCommandFunction()[interaction.commandName](interaction)
            } catch (error: any) {
                console.log(error)
                return interaction.reply({ embeds: [errorMessage()] })
            }
        } else {
            try {
                if (!interaction.channel) return interaction.reply({ embeds: [errorMessage('????????? ???????????? ???????????????.')] })

                getCommandFunction()[interaction.commandName](interaction)

                if (interaction.channel.isDMBased() || !interaction.guild) return
                const guildSetting = await getGuildOption(interaction.guild.id)
                const guildId = interaction.guild.id
                await updateTodayGuildStatistics(guildId, 'todayUsedCommands', prev => prev + 1)
                await updateTodayMemberStatistics(guildId, interaction.user.id, 'todayUsedCommands', prev => prev + 1)

                log({
                    content: `????????? ?????? : ${interaction.member!.user.username} / ????????? ????????? : ${interaction.commandName}`,
                    guild: interaction.guild!,
                    type: 'useCommand'
                })

                if (guildSetting?.useLevelSystem) {
                    await addMemberExp(interaction.member! as GuildMember, 5)
                    await checkLevelUp(interaction.member! as GuildMember, interaction.channel!)
                }
            } catch (error) {
                console.log(error)
                interaction.reply({ embeds: [errorMessage()] })
            }
        }
    }
})

client.on('guildCreate', async (guild) => {
    await removeGuildData(guild.id)
    await addMod(guild, await getGuildOwner(guild))
    guildSetting(guild)
    guild.roles.everyone.permissions.remove('MentionEveryone')
})

client.on('guildDelete', async (guild) => {
    try {
        removeGuildData(guild.id)
    } catch (error: any) {
        console.log(error)
    }
})

client.on('guildMemberAdd', async member => {
    await updateTodayGuildStatistics(member.guild.id, 'todayNewUsers', prev => prev + 1)

    await addMemberData(member)
    await addUserData(member.id)
    await welcome(member)
})

client.on('guildMemberRemove', async (member) => {
    if (member.id === client.user?.id) return
    await removeMemberData(member)
    await goodbye(member)
})

client.on('channelCreate', async (channel) => {
    if (channel.isDMBased()) return
    
    await addGuildChannel(channel)
})

client.on('channelDelete', async (channel) => {
    if (channel.isDMBased()) return

    await removeGuildChannel(channel)
})

client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (oldChannel.isDMBased() || newChannel.isDMBased()) return

    await modifyGuildChannel(oldChannel, newChannel)
})

client.on('guildBanAdd', async banMember => {
    if (banMember.user.id === client.user?.id) return
    try {
        const thisGuild = banMember.guild
        await addBan(thisGuild.id, banMember)

        const option = (await getGuildOption(thisGuild.id))
        if (!option) return
        const channel = await getChannel(thisGuild, option.banChannelId)

        log({
            content: `?????? ????????? : ${banMember.user.username}`,
            guild: thisGuild,
            type: 'addBan'
        })

        if (!channel || !channel.isTextBased()) return
        option.banMessageEnabled && channel.send({ embeds: [someoneHasBan(banMember.user.tag, banMember.reason || '???????????? ??????')] })
    } catch (e) { console.log(e) }
})

client.on('guildBanRemove', async (banMember) => {
    try {
        const thisGuild = banMember.guild
        const option = (await getGuildOption(thisGuild.id))!
        const channel = await getChannel(thisGuild, option.banChannelId)

        await removeBan(thisGuild.id, banMember.user.id)

        log({
            content: `?????? ????????? : ${banMember.user.username}`,
            guild: thisGuild,
            type: 'removeBan'
        })

        if (!channel || !channel.isTextBased()) return
        option.unbanMessageEnabled && channel.send({ embeds: [someoneHasUnban(banMember.user.username, banMember.reason || '???????????? ??????')] })

    } catch (e) { console.log(e) }
})

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.user.id === client.user?.id) return

    await updateMemberData(newMember)
    try {
        const thisGuild = oldMember.guild

        if (!await hasModRole(oldMember) && await hasModRole(newMember)) {
            await addMod(thisGuild, newMember)
        } else if (await hasModRole(oldMember) && !await hasModRole(newMember)) {
            await removeMod(thisGuild, newMember)
        }

        const oldRoles = oldMember.roles.cache.map(r => r.id)
        const newRoles = newMember.roles.cache.map(r => r.id)

        const deletedRole = oldRoles.filter(r => !newRoles.includes(r))
        const addedRole = newRoles.filter(r => !oldRoles.includes(r))

        deletedRole.forEach(async id => {
            const role = await getGuildRole(thisGuild, id)
            if (!role) return
            log({
                content: `?????? ????????? : ${newMember.user.username} / ????????? ?????? : ${role.name}`,
                guild: thisGuild,
                type: 'removeRoleToMember'
            })
        })
        addedRole.forEach(async id => {
            const role = await getGuildRole(thisGuild, id)
            if (!role) return
            log({
                content: `?????? ????????? : ${newMember.user.username} / ????????? ?????? : ${role.name}`,
                guild: thisGuild,
                type: 'addRoleToMember'
            })
        })
    } catch {
        return
    }
})

client.on('userUpdate', async (oldUser, newUser) => {
    if (oldUser.id === client.user?.id) return

    await updateUserData(newUser.id)
})

client.on('guildUpdate', async (oldGuild, newGuild) => {
    await addOrUpdateGuildData(newGuild)
})

client.on('messageDelete', async (message) => { 
    try {
        if (!message.guild) return
        log({
            content: `????????? ????????? / ????????? ????????? : ${message.member!.user.username} / ?????? : ${message.content || '??? ??? ?????? (null)'}`,
            guild: message.guild,
            type: 'removeMessage'
        })
    } catch { return }
})

client.on('roleCreate', async role => {
    await addGuildRole(role)
})

client.on('roleDelete', async role => {
    await removeGuildRole(role)
})

client.on('roleUpdate', async (oldRole, newRole) => {
    await modifyGuildRole(oldRole, newRole)
    await addOrUpdateGuildData(newRole.guild)
})

client.on('threadCreate' ,async thread => {
    log({
        content: `????????? ????????? / ????????? ?????? : ${thread.name} / ????????? ????????? : ${thread}`,
        guild: thread.guild,
        type: 'threadCreate'
    })
})

client.on('threadDelete', async thread => {
    log({
        content: `????????? ????????? / ????????? ?????? : ${thread.name} / ????????? ????????? : ${thread}`,
        guild: thread.guild,
        type: 'threadDelete'
    })
})

client.on('threadMemberUpdate', async (oldMember, newMember) => {
    const thread = newMember.thread

    if (oldMember.joinedTimestamp === newMember.joinedTimestamp) return
    if (oldMember.joinedTimestamp === null && newMember.joinedTimestamp !== null) {
        log({
            content: `????????? ????????? / ????????? ?????? : ${thread.name} / ????????? : ${newMember.user?.tag || '??? ??? ??????'}`,
            guild: thread.guild,
            type: 'threadMemberUpdate'
        })
    } else {
        log({
            content: `????????? ?????? / ????????? ?????? : ${thread.name} / ?????? ?????? : ${newMember.user?.tag || '??? ??? ??????'}`,
            guild: thread.guild,
            type: 'threadMemberUpdate'
        })
    }
})

client.on('threadUpdate', async (oldThread, newThread) => {
    const changedData = []
    if (oldThread.name !== newThread.name) changedData.push(`?????? : ${oldThread.name} -> ${newThread.name}`)
    if (oldThread.archived !== newThread.archived) changedData.push(`???????????? : ${oldThread.archived ? '?????????' : '????????????'} -> ${newThread.archived ? '?????????' : '????????????'}`)
    if (oldThread.locked !== newThread.locked) changedData.push(`????????? ?????? : ${oldThread.locked ? '??????' : '?????? ??????'} -> ${newThread.locked ? '??????' : '?????? ??????'}`)
    if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) changedData.push(`??????????????? ???????????? : ${oldThread.autoArchiveDuration} -> ${newThread.autoArchiveDuration}`)
    if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) changedData.push(`????????? ?????? : ${oldThread.rateLimitPerUser} -> ${newThread.rateLimitPerUser}`)

    log({
        content: `????????? ????????? / ????????? ?????? : ${newThread.name} / ????????? ?????? : ${changedData.join(', ')}`,
        guild: newThread.guild,
        type: 'threadUpdate'
    })
})

client.on('emojiCreate', async emoji => {
    log({
        content: `????????? ????????? / ????????? ?????? : ${emoji.name} / ????????? ????????? : ${emoji.author?.tag || '??? ??? ??????'}`,
        guild: emoji.guild,
        type: 'emojiCreate'
    })
})

client.on('emojiDelete', async emoji => {
    log({
        content: `????????? ????????? / ????????? ?????? : ${emoji.name}`,
        guild: emoji.guild,
        type: 'emojiDelete'
    })
})

client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    log({
        content: `????????? ????????? / ????????? ?????? : ${newEmoji.name} / ????????? ?????? : ?????? : ${oldEmoji.name} -> ${newEmoji.name}`,
        guild: newEmoji.guild,
        type: 'emojiUpdate'
    })
})

client.on('guildScheduledEventCreate', async event => {
    if (!event.guild) return
    log({
        content: `?????? ????????? / ?????? ?????? : ${event.name} / ?????? ????????? : ${event.creator?.tag || '??? ??? ??????'}`,
        guild: event.guild,
        type: 'guildScheduledEventCreate'
    })
})

client.on('guildScheduledEventDelete', async event => {
    if (!event.guild) return
    log({
        content: `?????? ????????? / ?????? ?????? : ${event.name}`,
        guild: event.guild,
        type: 'guildScheduledEventDelete'
    })
})

client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
    if (!oldEvent || !newEvent) return
    if (!newEvent.guild) return
    const changedData = []
    const oldLocation = oldEvent.entityMetadata?.location || '??? ??? ??????'
    const newLocation = newEvent.entityMetadata?.location || '??? ??? ??????'
    const oldScheduledStart = oldEvent.scheduledStartAt ? `${getCurrentDate(oldEvent.scheduledStartAt)} ${getCurrentTime(oldEvent.scheduledStartAt)}` : '??? ??? ??????'
    const newScheduledStart = newEvent.scheduledStartAt ? `${getCurrentDate(newEvent.scheduledStartAt)} ${getCurrentTime(newEvent.scheduledStartAt)}` : '??? ??? ??????'
    const oldScheduledEnd = oldEvent.scheduledEndAt ? `${getCurrentDate(oldEvent.scheduledEndAt)} ${getCurrentTime(oldEvent.scheduledEndAt)}` : '??? ??? ??????'
    const newScheduledEnd = newEvent.scheduledEndAt ? `${getCurrentDate(newEvent.scheduledEndAt)} ${getCurrentTime(newEvent.scheduledEndAt)}` : '??? ??? ??????'
    const oldStatus = oldEvent.status === GuildScheduledEventStatus.Scheduled ?'?????????' : oldEvent.status === GuildScheduledEventStatus.Active ? '????????????' : oldEvent.status === GuildScheduledEventStatus.Completed ? '?????????' : oldEvent.status === GuildScheduledEventStatus.Canceled ? '?????????' : '??? ??? ??????'
    const newStatus = newEvent.status === GuildScheduledEventStatus.Scheduled ? '?????????' : newEvent.status === GuildScheduledEventStatus.Active ? '????????????' : newEvent.status === GuildScheduledEventStatus.Completed ? '?????????' : newEvent.status === GuildScheduledEventStatus.Canceled ? '?????????' : '??? ??? ??????'

    if (oldEvent.name !== newEvent.name) changedData.push(`?????? : ${codeBlock(oldEvent.name)} -> ${codeBlock(newEvent.name)}`)
    if (oldEvent.description !== newEvent.description) changedData.push(`?????? : ${codeBlock(oldEvent.description || '??? ??? ??????')} -> ${codeBlock(newEvent.description || '??? ??? ??????')}`)
    if (oldLocation !== oldLocation) changedData.push(`?????? : ${codeBlock(oldLocation)} -> ${codeBlock(newLocation)}`)
    if (oldScheduledStart !== newScheduledStart) changedData.push(`?????? ?????? : ${codeBlock(oldScheduledStart)} -> ${codeBlock(newScheduledStart)}`)
    if (oldScheduledEnd !== newScheduledEnd) changedData.push(`?????? ?????? : ${oldScheduledEnd} -> ${newScheduledEnd}`)
    if (oldStatus !== newStatus) changedData.push(`?????? : ${codeBlock(oldStatus)} -> ${codeBlock(newStatus)}`)
    if (oldEvent.coverImageURL() !== newEvent.coverImageURL()) changedData.push(`?????? ????????? : ${codeBlock(oldEvent.coverImageURL() || '??????')} -> ${codeBlock(newEvent.coverImageURL() || '??????')}`)

    log({
        content: `?????? ????????? / ?????? ?????? : ${newEvent.name} / ????????? ?????? : ${changedData.join('\n')}`,
        guild: newEvent.guild,
        type: 'guildScheduledEventUpdate'
    })
})

client.on('guildScheduledEventUserAdd', async (event, user) => {
    if (!event.guild) return
    log({
        content: `?????? ????????? ????????? / ?????? ?????? : ${event.name} / ????????? : ${user.tag}`,
        guild: event.guild,
        type: 'guildScheduledEventUserAdd'
    })
})

client.on('guildScheduledEventUserRemove', async (event, user) => {
    if (!event.guild) return
    log({
        content: `?????? ????????? ????????? / ?????? ?????? : ${event.name} / ????????? : ${user.tag}`,
        guild: event.guild,
        type: 'guildScheduledEventUserRemove'
    })
})

client.on('inviteCreate', async invite => {
    if (!invite.guild) return
    log({
        content: `?????? ?????? ????????? / ?????? ?????? : ${invite.url}`,
        guild: invite.guild as Guild,
        type: 'inviteCreate'
    })
})

client.on('inviteDelete', async invite => {
    if (!invite.guild) return
    log({
        content: `?????? ?????? ????????? / ?????? ?????? : ${invite.url}`,
        guild: invite.guild as Guild,
        type: 'inviteDelete'
    })
})

client.login(env.BOT_TOKEN)
