using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Prescription
{
    [Required] public string Name { get; set; } = string.Empty;

    [Required] public string Usage { get; set; } = string.Empty;

    [Required] public string Frequency { get; set; } = string.Empty;

    [Required] public string Note { get; set; } = string.Empty;
}