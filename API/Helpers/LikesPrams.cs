using System;

namespace API.Helpers;

public class LikesPrams : PaginationParams
{
    public int UserId { get; set; }
    public required string Predicate { get; set; } = "liked";
}
