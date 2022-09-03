import { Routes, EmbedBuilder } from "discord.js"
import { env } from ".."
import getCommands from "../commands"
import { rest, BOT_COLOR } from "../lib"

export const addSlashCommands = async () => {
    try {
        await rest.put(Routes.applicationCommands(env.BOT_ID!), { body: getCommands() })
    } catch (error) {
        console.error(error)
    }
}

export const getCurrentTime = (now: Date = new Date()) => {
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
}

export const getCurrentDate = (now: Date = new Date()) => {
    return `${now.getFullYear()}/${now.getMonth().toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`
}

export const errorMessage = () => {
    return new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle(':x: 오류가 발생했습니다!')
}

export const noPermissionMessage = () => {
    return new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle(':no_entry_sign: 권한이 없습니다.')
}

export const completeSuccessfullyMessage = () => {
    return { color: BOT_COLOR, title: ':white_check_mark: 성공적으로 처리되었습니다.' }
}

export const makeRandomString = (length: number) => {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i<length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
   }
   return result
}

export const toJSON = (obj: any) => {
    return JSON.stringify(obj)
}

export const toObject = (string: string) => {
    return JSON.parse(string)
}