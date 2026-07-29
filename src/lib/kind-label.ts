export function kindLabel(kind: string): string {
  switch (kind) {
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "book":
      return "Book";
    case "email":
      return "Email";
    case "podcast":
      return "Podcast";
    default:
      return "Article";
  }
}
