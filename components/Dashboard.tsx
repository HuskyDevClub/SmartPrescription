import React, {useEffect, useRef, useState} from 'react';
import {MedicalPrescription} from "./models/MedicalPrescription";
import {HttpService} from "./http.service";
import {Message} from "@/components/ollama.interfaces";
import {PrescriptionsTable, PrescriptionsTableHandle} from "@/components/PrescriptionsTable";

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

    async function chat(thePrompt: string, question: string = ""): Promise<void> {
        messages.push({role: "user", content: thePrompt, images: attachments} as Message);
        console.log(messages);
        responses.push("User:")
        responses.push(question ? question : thePrompt);
        responses.push(`AI (${selectedModel}):`)
        // responses.push(await OllamaController.chatAsync(selectedModel, messages, setResponse))
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

    return (
        <div>
            <div hidden={responses.length === 0 && responses.length === 0}>
                <h2>Response:</h2>
                {responses.map((option, index) => (
                    <p key={index}>{option}</p>
                ))}
                <p>{response}</p>
            </div>
            <h2 hidden={responses.length != 0 || responses.length != 0}>What can I help with?</h2>
            <textarea placeholder="Message GPT Assistance" rows={10} cols={50} value={prompt}
                      onChange={e => setPrompt(e.target.value)}/><br/>
            <label className="form-label">Model: </label>
            <select onChange={e => setSelectedModel(e.target.value)}>
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select><br/>
            <button onClick={askGpt} disabled={prompt.length === 0}>Chat</button>
            <button onClick={getMedicineInfo}>Get Medicine Information</button>
            <button onClick={clearHistory}>Clear</button>
            <br/>
            <input type="file" id="fileInput" multiple onChange={handleFileChange} className="hidden"/><br/>
            <PrescriptionsTable ref={prescriptionsTableRef}></PrescriptionsTable>
        </div>
    );
}