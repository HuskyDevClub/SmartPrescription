import React, {useEffect, useState} from 'react';
import {HttpService} from "@/components/services/HttpService";
import {ChatRequest, Message} from "@/components/ollama.interfaces";
import {Button, StyleSheet, Text, TextInput, View} from "react-native";
import {Picker} from '@react-native-picker/picker';
import {OllamaService} from "@/components/services/OllamaService";

export function Dashboard() {
    const [prompt, setPrompt] = useState('');
    const [llmModels, setLlmModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [responses, setResponses] = useState<string[]>([]);
    const [response, setResponse] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);

    // ask gpt the question
    async function askGpt(): Promise<void> {
        if (!prompt) {
            alert('Please select a model and enter a prompt.');
            return;
        }
        await chat(prompt);
        setPrompt("");
    }

    async function chat(thePrompt: string, question: string = ""): Promise<void> {
        messages.push({role: "user", content: thePrompt} as Message);
        responses.push("User:")
        responses.push(question ? question : thePrompt);
        responses.push(`AI (${selectedModel}):`)
        try {
            const theResult = await OllamaService.chat({
                messages: messages,
                model: selectedModel
            } as ChatRequest, setResponse);
            setResponse("");
            responses.push(theResult)
        } catch (error) {
            responses.push(`Failed to send message:${error}`)
        }
    }

    async function clearHistory(): Promise<void> {
        setResponses([]);
        setMessages([]);
    }

    // Fetch the models when the component mounts
    useEffect(() => {
        async function fetchModels(): Promise<void> {
            const models: string[] = [];
            try {
                for (const model of (await HttpService.getModels()).data) {
                    models.push(model.name);
                }
            } catch (e) {
                console.error(e)
            }
            setLlmModels(models);
            if (models) {
                setSelectedModel(models[0])
            }
        }

        fetchModels().then(); // Call the async function
    }, []); // Empty dependency array ensures it only runs once

    // Render item for list
    const RenderResponse: React.FC = () => {
        if (responses && responses.length > 0) {
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
            <View style={styles.inputForm}>
                <Text className="form-label">Model:</Text>
                <Picker onValueChange={(itemValue: string, _) => setSelectedModel(itemValue)} style={{flex: 1}}>
                    {llmModels.map((option, index) => (
                        <Picker.Item label={option} value={option} key={index}/>
                    ))}
                </Picker>
            </View>
            <View style={styles.inputForm}>
                <Button onPress={askGpt} disabled={prompt.length === 0} title="Chat"/>
                <Button onPress={clearHistory} title="Clear"/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 50,
    },
    inputForm: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});