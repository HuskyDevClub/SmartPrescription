import axios from 'axios';

const URL: string = "http://localhost:5065/api";

export class HttpService {

    // get models
    public static getModels(): Promise<any> {
        return axios.get(`${URL}/ollama/tags`)
    }

}