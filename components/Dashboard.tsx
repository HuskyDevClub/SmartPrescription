import React, {useState} from 'react';
import {Button, StyleSheet, Text, TextInput, View} from "react-native";
import {ChatRequest, Message, OllamaService} from "@/components/services/OllamaService";
import {UserDataService} from "@/components/services/UserDataService";

export function Dashboard() {
    const [prompt, setPrompt] = useState('');
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
        if (messages.length <= 0) {
            const thePrescriptions: Record<string, string>[] = await UserDataService.try_get("Prescriptions", [])
            thePrescriptions.forEach(p => {
                delete p["id"]
            })
            const currPrescriptions = JSON.stringify(thePrescriptions)
            const currTime = new Date().toISOString();
            messages.push({
                role: "user",
                content: `Here are some of the medicine I am taking:${currPrescriptions}, and right now is ${currTime}. Only use these information when you need these information. If you don not need it, just pretend that they do not exist.`
            });
            messages.push({role: "assistant", content: "Ok, I got it."})
        }

        messages.push({role: "user", content: thePrompt});
        responses.push("User:")
        responses.push(question ? question : thePrompt);
        responses.push(`AI:`)
        try {
            const theResult = await OllamaService.chat({
                messages: messages
            } as ChatRequest, setResponse);
            setResponse("");
            responses.push(theResult)
            messages.push({role: "assistant", content: theResult})
        } catch (error) {
            responses.push(`Failed to send message:${error}`)
        }
    }

    async function clearHistory(): Promise<void> {
        setResponses([]);
        setMessages([]);
    }

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