import React, {useEffect, useRef, useState} from 'react';
import {MedicalPrescription} from "./models/MedicalPrescription";
import {HttpService} from "./http.service";
import {ChatRequest, Message} from "@/components/ollama.interfaces";
import {PrescriptionsTable, PrescriptionsTableHandle} from "@/components/PrescriptionsTable";
import {Button, StyleSheet, Text, TextInput, View} from "react-native";
import {Picker} from '@react-native-picker/picker';

export function Dashboard() {
    const [prompt, setPrompt] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [responses, setResponses] = useState<string[]>([]);
    const [response, setResponse] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    // Create a ref to access the PrescriptionsTable methods
    const prescriptionsTableRef = useRef<PrescriptionsTableHandle>(null);

    // ask gpt the question
    async function askGpt(): Promise<void> {
        if (!prompt) {
            alert('Please select a model and enter a prompt.');
            return;
        }
        await chat(prompt);
        setPrompt("");
    }

    const sendChatRequest = async (requestData: ChatRequest) => {
        try {
            // Use fetch API for better streaming support
            const streamedResponse = await HttpService.chatWithLLM(requestData);

            // Get reader from response body stream
            const reader = streamedResponse.body!.getReader();
            const decoder = new TextDecoder();

            // the response string
            let aiResponse: string = "";

            // Read stream chunks
            while (true) {
                const {done, value} = await reader.read();

                if (done) {
                    break;
                }

                // Decode chunk and process SSE format
                const chunk = decoder.decode(value, {stream: true});

                // Update response
                aiResponse += chunk;
                setResponse(aiResponse);
            }

            return aiResponse
        } catch (error) {
            console.error('Error fetching stream:', error);
            throw error;
        }
    };

    async function chat(thePrompt: string, question: string = ""): Promise<void> {
        messages.push({role: "user", content: thePrompt, images: attachments} as Message);
        responses.push("User:")
        responses.push(question ? question : thePrompt);
        responses.push(`AI (${selectedModel}):`)
        try {
            const theResult = await sendChatRequest({
                messages: messages,
                model: selectedModel
            } as ChatRequest);
            setResponse("");
            responses.push(theResult)
        } catch (error) {
            responses.push(`Failed to send message:${error}`)
        }
        setAttachments([])
    }

    async function getMedicineInfo(): Promise<void> {
        let thePrompt = "Extract all the text from the image."
        messages.push({role: "user", content: thePrompt, images: attachments} as Message);
        console.log(messages);
        responses.push("User:")
        responses.push(thePrompt);
        responses.push(`AI (${selectedModel}):`)
        const result: MedicalPrescription = (await HttpService.getImageText({
            model: selectedModel,
            images: attachments
        })).data;
        // Trigger adding a new prescription from the parent component
        if (prescriptionsTableRef.current) {
            // Call the handleAdd function exposed via ref
            prescriptionsTableRef.current.handleAdd(result);
        }
        responses.push("Done")
        console.log(result);
        setAttachments([])
    }

    async function clearHistory(): Promise<void> {
        setResponses([]);
        setMessages([]);
        setAttachments([]);
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            for (let i = 0; i < event.target.files.length; i++) {
                let reader = new FileReader();
                reader.readAsDataURL(event.target.files[i]);
                reader.onload = function () {
                    attachments.push(reader.result!.toString().split(",")[1])
                };
                reader.onerror = function (error) {
                    console.log('Error: ', error);
                };
            }
        }
    };

    // Fetch the models when the component mounts
    useEffect(() => {
        async function fetchModels(): Promise<void> {
            const models: string[] = [];
            for (const model of (await HttpService.getModels()).data) {
                models.push(model.name);
            }
            setOptions(models);
            setSelectedModel(models[0])
        }

        fetchModels().then(); // Call the async function
    }, []); // Empty dependency array ensures it only runs once

    // Render item for list
    const RenderResponse: React.FC = () => {
        if (responses) {
            return (
                <View>
                    <Text>Response:</Text>
                    {responses.map((option, index) => (
                        <Text key={index}>{option}</Text>
                    ))}
                    <Text>{response}</Text>
                </View>
            )
        } else {
            return (<Text>What can I help with?</Text>)
        }
    };

    return (
        <View>
            <RenderResponse/>
            <TextInput placeholder="Message GPT Assistance" value={prompt}
                       onChangeText={(text: string) => setPrompt(text)} style={styles.input}/>
            <Text className="form-label">Model: </Text>
            <Picker onValueChange={(itemValue: string, itemIndex: number) => setSelectedModel(itemValue)}>
                {options.map((option, index) => (
                    <Picker.Item label={option} value={option} key={index}/>
                ))}
            </Picker>
            <Button onPress={askGpt} disabled={prompt.length === 0} title="Chat"/>
            <Button onPress={getMedicineInfo} title="Get Medicine Information"/>
            <Button onPress={clearHistory} title="Clear"/>
            <PrescriptionsTable ref={prescriptionsTableRef}/>
        </View>
    );

    // <input type="file" id="fileInput" multiple onChange={handleFileChange} className="hidden"/>
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 50,
        marginBottom: 15,
    },
});