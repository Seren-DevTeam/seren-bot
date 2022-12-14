import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction, ComponentType, EmbedBuilder } from "discord.js"
import { BOT_COLOR } from "../lib"
import { sendDM } from "../utils/discord"

const helloUser = (name: string) => {
    return new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle(`:wave: 안녕하세요, ${name}님!`)
        .setDescription('만나서 반갑습니다! 저는 다재다능한 아주 멋진 봇, Seren입니다 :)\n')
}

const helpButton =  new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('✨ 사용 방법')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('help')
        )

const howtoUse = new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle('✨ 사용 방법')
        .setDescription('Seren 봇은 아주 많고 유용한 기능을 가지고 있습니다. 한번 알아볼까요? ')
        .addFields(
            { name: '­­­­\n', value: '**< 기본 명령어 >**' },
            { name: '핑', value: '> 봇 응답시간을 테스트합니다', inline: true },
            { name: '도움말', value: '> 봇 명령어 리스트를 출력합니다', inline: true },
            { name: '정보', value: '> 서버의 자세한 정보를 알려줍니다', inline: true },
            { name: '리스트', value: '> 관리자가 누구인지, 금지어가 무엇인지 볼 수 있습니다', inline: true }
        )
        .addFields(
            { name: '­­­­\n', value: '**< 코인게임 >**' },
            { name: '코인가격', value: '> 코인의 가격을 확인합니다', inline: true },
            { name: '코인구매', value: '> 코인을 구매합니다', inline: true },
            { name: '코인판매', value: '> 코인을 판매합니다', inline: true },
            { name: '코인댓글', value: '> 코인에 댓글을 답니다 (웹에서 확인가능)', inline: true },
            { name: '내코인', value: '> 내 코인의 갯수, 가치, 내 포인트를 확인합니다', inline: true }
        )

export default async function hello(interaction: ChatInputCommandInteraction<CacheType>) {
    await sendDM(interaction.user.id, { embeds: [helloUser(interaction.user.username)], components: [helpButton] })
    const collector = interaction.user.dmChannel?.createMessageComponentCollector({
        max: 1,
        time: 30000,
        componentType: ComponentType.Button,
        filter: click => click.user.id === interaction.user.id,
    })

    collector!.on('collect', interaction => {
        interaction.reply({ embeds: [howtoUse] })
    })

    await interaction.editReply({ embeds: [{ color: BOT_COLOR, title: `:wave: 안녕하세요, ${interaction.user.username}님!` }] })
}