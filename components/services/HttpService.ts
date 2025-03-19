import axios from 'axios';
import {fetch} from 'expo/fetch';

const URL: string = "http://localhost:5065/api";

export class HttpService {

    // get models
    public static getModels(): Promise<any> {
        return axios.get(`${URL}/ollama/tags`)
    }

    // get text
    public static getImageText(data: object): Promise<any> {
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