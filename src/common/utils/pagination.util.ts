export class PaginationUtil {
  static getPaginationParams(query: Record<string, any>) {
    const page = parseInt(String(query.page), 10) || 1;
    const limit = parseInt(String(query.limit), 10) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }
}
