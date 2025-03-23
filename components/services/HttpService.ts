import axios from 'axios';
import {fetch} from 'expo/fetch';

const URL: string = "http://localhost:5065/api";

export class HttpService {

    // get text
    public static getImageText(data: object): Promise<any> {
    public static getImageText(data: string[]): Promise<any> {
        return axios.post(`${URL}/ollama/extract`, data)
    }

    // chat with llm
    public static chatWithLLM(requestData: object) {
        return fetch(`${URL}/ollama/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(requestData)
        })
    }
}