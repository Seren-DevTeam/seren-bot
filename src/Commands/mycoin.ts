import { UserCoinData } from "@prisma/client"
import { blockQuote, bold, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { BOT_COLOR } from "../lib"
import { getCoinData, getUserCoinData } from "../utils/coin"
import { getUserData } from "../utils/userData"

const coinEmbed = async (data: UserCoinData[], point: number) => {
    return new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle(':money_mouth: 내 코인')
        .setDescription(bold(`보유 포인트 : ${point}포인트 / 평가 가치 : ${
            await data.map(async c => c.amount*(await getCoinData(c.coinId)).price).reduce(async (a, b) => await a+await b)
        }포인트`))
        .addFields(
            data.length === 0 ?
                [{ name: '보유한 코인이 없습니다', value: '코인을 구매해보세요!' }] :
                data.sort((a, b) => b.amount - a.amount).map(d => ({ name: d.name, value: blockQuote(`${d.amount}개`), inline: true }))
        )
        .setFooter({ text: '코인을 구매하려면 /코인구매 명령어를 사용해주세요' })
}

export default async function coinbuy(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const userCoinData = await getUserCoinData(interaction.user.id)
    const userData = await getUserData(interaction.user.id)

    await interaction.editReply({ embeds: [await coinEmbed(userCoinData, userData.point)] })
}
