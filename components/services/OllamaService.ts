import {ChatRequest} from "@/components/ollama.interfaces";
import {HttpService} from "@/components/services/HttpService";

export class OllamaService {
    public static async chat(requestData: ChatRequest, setResponse: (arg0: string) => void): Promise<string> {
        try {
            // Use fetch API for better streaming support
            const streamedResponse = await HttpService.chatWithLLM(requestData);

            // Get reader from response body stream
            const reader = streamedResponse.body!.getReader();
            const decoder = new TextDecoder();

            // the response string
            let currResponse: string = "";

            // Read stream chunks
            while (true) {
                const {done, value} = await reader.read();

                if (done) {
                    break;
                }

                // Decode chunk and process SSE format
                const chunk = decoder.decode(value, {stream: true});

                // Update response
                currResponse += chunk;
                setResponse(currResponse);
            }

            return currResponse
        } catch (error) {
            console.error('Error fetching stream:', error);
            throw error;
        }
    };
}