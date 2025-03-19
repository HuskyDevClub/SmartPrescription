using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class ImageExtractRequest
{
    [Required] public string[] Images { get; set; } = [];
}