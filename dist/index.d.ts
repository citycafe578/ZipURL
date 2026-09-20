export type Prefix = string;

export function compress(text: string, prefix?: Prefix): string;
export function decompress(compressedText: string): string;

declare const ZipURL: {
    compress: typeof compress;
    decompress: typeof decompress;
};

export default ZipURL;
