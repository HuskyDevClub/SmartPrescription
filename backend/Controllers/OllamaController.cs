using System.Text;
using System.Text.Json;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using OllamaSharp;
using OllamaSharp.Models.Chat;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OllamaController : ControllerBase
{
    private const string MODEL = "gemma3:12b";
    private static readonly OllamaApiClient OLLAMA = new(new Uri("http://localhost:11434"));

    [HttpPost("extract")]
    public async Task<ActionResult<Prescription>> Extract(string[] images)
    {
        Message[] messages =
        [
            new()
            {
                Content =
                    "If the given image is not a photo of prescription medication label, return {} in JSON format; otherwise extract following information in JSON format: Name: medication name, Usage: Instruction for use, Qty: Medication quantity (integer), Refills: Refills remaining (integer), Discard: Date to discard (YYYY-MM-DD), Note: anything else that need special attention} Return your answer as a valid JSON object. Ensure all quotes are properly escaped, all brackets are balanced, and the structure is parseable.",
                Images = images,
                Role = "user"
            }
        ];

        ChatRequest chatRequest = new()
        {
            Messages = messages,
            Model = MODEL,
            Format = "json"
        };
        StringBuilder result = new();
        await foreach (ChatResponseStream? stream in OLLAMA.ChatAsync(chatRequest))
            if (stream != null)
                result.Append(stream.Message.Content);

        Prescription thePrescription = JsonSerializer.Deserialize<Prescription>(result.ToString())!;

        return thePrescription;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat(ChatRequest req)
    {
        // Set headers for SSE
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        // Create a cancellation token linked to the client connection
        CancellationToken cancellationToken = HttpContext.RequestAborted;

        try
        {
            // set model to currently selected model
            req.Model = MODEL;

            // Use StreamWriter to send data to the client
            await using StreamWriter writer = new(Response.Body, Encoding.UTF8);

            // Stream each chunk from Ollama
            await foreach (ChatResponseStream? stream in OLLAMA.ChatAsync(req).WithCancellation(cancellationToken))
            {
                if (stream == null || string.IsNullOrEmpty(stream.Message.Content)) continue;

                // Send serialized message
                await writer.WriteAsync(stream.Message.Content);
                await writer.FlushAsync(cancellationToken);
            }

            return new EmptyResult();
        }
        catch (OperationCanceledException)
        {
            // Client disconnected
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            // If we haven't started streaming yet, return an error
            if (!Response.HasStarted) return StatusCode(500, $"Error streaming chat: {ex.Message}");

            // If we're already streaming, try to send an error
            try
            {
                await using StreamWriter writer = new(Response.Body, Encoding.UTF8);
                await writer.WriteAsync($",{{\"error\":\"{ex.Message}\"}}]");
                await writer.FlushAsync(cancellationToken);
            }
            catch
            {
                // Ignore exceptions when trying to send error in stream
            }

            return new EmptyResult();
        }
    }
}