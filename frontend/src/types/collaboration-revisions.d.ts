declare module "@codeknit/collaboration" {
  export function recordRevision(doc: any, input: {
    userId: string;
    fileId: string;
    type?: string;
    timestamp?: number;
    description?: string;
  }): any;

  export function listRevisions(doc: any, filters?: {
    fileId?: string;
    userId?: string;
    type?: string;
  }): any[];
}
