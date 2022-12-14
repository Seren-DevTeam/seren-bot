import { Guild } from "discord.js"
import { client } from ".."
import prisma from "../prisma"
import { isCommunity } from "./discord"

export const getGuildData = async (guildId: string) => {
    return await prisma.guildData.findUnique({ where: { guildId } })
}

export const addOrUpdateGuildData = async (guild: Guild) => {
    await prisma.guildData.upsert({
        where: { guildId: guild.id },
        update: {
            name: guild.name,
            ownerId: guild.ownerId,
            icon: guild.iconURL() || 'none',
            memberCount: guild.memberCount,
            botCount: guild.members.cache.filter(member => member.user.bot).size!,
            region: guild.preferredLocale,
            createdAt: guild.createdAt,
            isPartner: guild.partnered,
            isVerified: guild.verified,
            premiumTier: guild.premiumTier,
            premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
            description: guild.description || '설명 없음',
            isCommunityGuild: isCommunity(guild),
            isBotRoleHighest: guild.roles.highest.id === (await guild.members.fetchMe()).roles.highest.id
        },
        create: {
            guildId: guild.id,
            name: guild.name,
            ownerId: guild.ownerId,
            icon: guild.iconURL() || 'none',
            memberCount: guild.memberCount,
            botCount: guild.members.cache.filter(member => member.user.bot).size!,
            region: guild.preferredLocale,
            createdAt: guild.createdAt,
            isPartner: guild.partnered,
            isVerified: guild.verified,
            premiumTier: guild.premiumTier,
            premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
            description: guild.description || '설정되지 않음',
            isCommunityGuild: isCommunity(guild),
            isBotRoleHighest: guild.roles.highest.id === (await guild.members.fetchMe()).roles.highest.id
        }
    })
}

export const removeGuildData = async (guildId: string) => {
    try {
        await prisma.guildData.deleteMany({ where: { guildId } })
        await prisma.guildBan.deleteMany({ where: { guildId } })
        await prisma.guildChannel.deleteMany({ where: { guildId } })
        await prisma.guildOption.deleteMany({ where: { guildId } })
        await prisma.blockword.deleteMany({ where: { guildId } })
        await prisma.memberData.deleteMany({ where: { guildId } })
        await prisma.guildRole.deleteMany({ where: { guildId } })
        await prisma.guildLog.deleteMany({ where: { guildId } })
        await prisma.guildLogSetting.deleteMany({ where: { guildId } })
    } catch (err: any) {
        console.log(err)
    }
}
