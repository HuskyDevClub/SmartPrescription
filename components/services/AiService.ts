import ModelClient from "@azure-rest/ai-inference";
import {AzureKeyCredential} from "@azure/core-auth";
import PrescriptionsSchema from "@/components/models/PrescriptionsSchema.json";

// the model client
const client = ModelClient(
    "",
    new AzureKeyCredential(""),
);

// The model that is selected
const MODEL: string = "mistral-small-2503"

// The prompt used for extraction
const EXTRACTION_PROMPT: string = "If the given image is not a photo of discharge medication orders, return a empty object; otherwise, the image likely contain multiple drugs, extract the following information for every drug in the image:\n" +
    "- type: The medication format (e.g., TAB for tablet, INJ for injection) which may sometimes appear combined with the medication name.\n" +
    "- name: The medication name that identifies the specific pharmaceutical product. Always exclude any Type information from this field.\n" +
    "- dosage: The size of a dose of a medicine or drug\n" +
    "- route: Routes of drug administration\n" +
    "- food: Timing of medication in relation to meals: Use 1 if medication should be taken before food, 2 if after food, or 0 if timing relative to food doesn't matter.\n" +
    "- frequency: The medication dosage schedule, represented by three digits (either 0 or 1) separated by hyphens.\n" +
    "- days: Thr number of days\n" +
    `Return your answer as a valid JSON object following schema: ${JSON.stringify(PrescriptionsSchema)}, using the index as the key, and the drug information data as the value.\n`

export class AiService {

    // get text
    public static getImageText(data: string[]): PromiseLike<any> {
        return client.path("/chat/completions").post({
            body: {
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: data[0],
                                    detail: "high",
                                },
                            },
                        ],
                    },
                    {role: "user", content: EXTRACTION_PROMPT},
                ],
                model: MODEL,
                response_format: {
                    type: "json_object"
                }
            },
        });
    }
}