const inputText = document.getElementById("inputText");
const copyBtn = document.getElementById("copyBtn");
const outputText = document.getElementById("outputText");
const outputLength = document.getElementById("length");
const lengthSummary = document.getElementById("length-summary");

const RLEoutputText = document.getElementById("RLEoutputText");
const RLElength = document.getElementById("RLElength");
const RLElengthSummary = document.getElementById("RLElength-summary");
const DeRLEText = document.getElementById("DeRLE");

const HUFoutputText = document.getElementById("HUFoutputText");
const HUFlength = document.getElementById("HUFlength");
const HUFlengthSummary = document.getElementById("HUFlength-summary");
const DeHUF = document.getElementById("DeHUF");

const LZ77outputText = document.getElementById("LZ77outputText");
const LZ77length = document.getElementById("LZ77length");
const LZ77lengthSummary = document.getElementById("LZ77length-summary");
const DeLZ77 = document.getElementById("DeLZ77");

const MIXoutputText = document.getElementById("MIXoutputText");
const MIXlength = document.getElementById("MIXlength");
const MIXlengthSummary = document.getElementById("MIXlength-summary");
const DeMIX = document.getElementById("DeMIX");

// RLE
function RLE(text){
    if(!text){
        return "";
    }
    let res = "";
    let cnt = 1;
    for (let i = 1; i <= text.length; i++) {
        if (i < text.length && text[i] === text[i - 1]) {
            cnt++;
            continue;
        }
        res += cnt + "#" + text[i - 1];
        cnt = 1;
    }

    return res;
}

function DeRLE(text){
    if (!text) {
        return "";
    }
    let res = "", len = text.length, i = 0;

    while (i < len) {
        let cnt = 0;
        while (i < len && text[i] >= '0' && text[i] <= '9'){
            cnt = cnt * 10 + (text[i] - '0');
            i++;
        }
        if (i < len && text[i] === '#'){
            i++;
        }
        if (i < len) {
            res += text[i].repeat(cnt || 1);
            i++;
        }
    }
    return res;
}

// 霍夫曼
class HuffmanNode {
    constructor(char, freq, left = null, right = null){
        this.char = char;
        this.freq = freq;
        this.left = left;
        this.right = right;
    }
}

class HuffmanCoding{

    static getFreqMap(text){
        const freqMap = {};

        for(const char of text){
            freqMap[char] = (freqMap[char] || 0) + 1;
        }

        return freqMap;
    }

    static buildTree(text){
        const freqMap = this.getFreqMap(text);

        const nodes = Object.entries(freqMap).map(([char, freq]) => new HuffmanNode(char, freq));

        if(nodes.length === 0){
            return null;
        }

        if(nodes.length === 1){
            const onlyNode = nodes[0];

            return new HuffmanNode(
                null,
                onlyNode.freq,
                onlyNode,
                null
            );
        }

        while(nodes.length > 1){

            nodes.sort((a, b) => a.freq - b.freq);

            const left = nodes.shift();
            const right = nodes.shift();

            const parent = new HuffmanNode(
                null,
                left.freq + right.freq,
                left,
                right
            );

            nodes.push(parent);
        }
        return nodes[0];
    }

    static buildCodeTable(root){

        const codeTable = {};
        function traverse(node, currentCode) {
            if(!node) return;
            if(!node.left && !node.right){
                codeTable[node.char] = currentCode || "0";
                return;
            }

            traverse(
                node.left,
                currentCode + "0"
            );

            traverse(
                node.right,
                currentCode + "1"
            );
        }
        traverse(root, "");
        return codeTable;
    }

    static bytesToCompactStr(bytes){
        let binary = "";

        for(let i = 0; i < bytes.byteLength; i++){
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    static compactStrToBytes(str, byteLength){
        const binary = atob(str);
        const bytes = new Uint8Array(byteLength);
        for(let i = 0; i < byteLength; i++){
            bytes[i] = binary.charCodeAt(i) || 0;
        }
        return bytes;
    }

    static encode(text){
        if (!text){
            return{
                encoded: "",
                tree: null,
                table: {},
                packed: new Uint8Array(),
                bitLength: 0,
                byteLength: 0,
                compactStr: ""
            };
        }

        const tree = this.buildTree(text);
        const table = this.buildCodeTable(tree);
        let encoded = "";
        for(const char of text){
            encoded += table[char];
        }

        const packedResult = this.packBits(encoded);
        const compactStrData = this.bytesToCompactStr(packedResult.data);
        return{
            encoded: encoded,
            tree: tree,
            table: table,
            packed: packedResult.data,
            bitLength: packedResult.bitLength,
            byteLength: packedResult.data.length,
            compactStr: compactStrData
        };
    }

    static packBits(encoded){

        if(!encoded){
            return{
                data: new Uint8Array(), bitLength: 0
            };
        }

        const bitLength = encoded.length;
        const byteLength = Math.ceil(bitLength / 8);
        const data = new Uint8Array(byteLength);

        for(let i = 0; i < bitLength; i++){
            const bit = encoded[i] === "1" ? 1 : 0;
            const byteIndex = Math.floor(i / 8);
            const bitIndex = 7 - (i % 8);
            data[byteIndex] |= bit << bitIndex;
        }

        return{
            data: data,
            bitLength: bitLength
        };
    }

    static unpackBits(data, bitLength){
        if(!data || bitLength <= 0){
            return "";
        }
        let encoded = "";
        for(let i = 0; i < bitLength; i++){
            const byteIndex = Math.floor(i / 8);
            const bitIndex = 7 - (i % 8);
            const bit = (data[byteIndex] >> bitIndex) & 1;
            encoded += bit;
        }
        return encoded;
    }

    static decode(encodedText, root){
        if(!encodedText || !root){
            return "";
        }
        let decoded = "";
        let currentNode = root;
        if(!root.left && !root.right){
            return root.char.repeat(
                encodedText.length
            );
        }

        for(const bit of encodedText){
            currentNode = (bit === "0")
                    ? currentNode.left
                    : currentNode.right;

            if(!currentNode.left && !currentNode.right){
                decoded += currentNode.char;
                currentNode = root;
            }
        }
        return decoded;
    }

    static decodePacked(data, bitLength, root){

        const encoded = this.unpackBits(data, bitLength);
        return this.decode( encoded, root);
    }
}

// LZ77
class LZ77 {
    static encode(text, windowSize = 255, minMatch = 3){ //可再修改
        if (!text) return "";

        let res = "";
        let i = 0;
        const len = text.length;

        while (i < len){
            let maxMatchLength = 0;
            let bestOffset = 0;
            const searchStart = Math.max(0, i - windowSize);

            for(let j = searchStart; j < i; j++){
                let matchLen = 0;
                while(i + matchLen < len && text[j + matchLen] === text[i + matchLen]){
                    matchLen++;
                }

                if(matchLen > maxMatchLength){
                    maxMatchLength = matchLen;
                    bestOffset = i - j;
                }
            }

            if(maxMatchLength >= minMatch){
                res += `(${bestOffset},${maxMatchLength})`;
                i += maxMatchLength;
            }else{
                //愈處理
                if (text[i] === '('){
                    res += "(0,1)";
                }else{
                    res += text[i];
                }
                i++;
            }
        }

        return res;
    }

    static decode(compressedText) {
        if (!compressedText) return "";

        let res = "";
        let i = 0;
        const len = compressedText.length;

        while (i < len) {
            // 遇到括號代表是引用 (offset,length)
            if (compressedText[i] === '(') {
                let j = i + 1;
                while (j < len && compressedText[j] !== ')') {
                    j++;
                }
                
                const tokenStr = compressedText.slice(i + 1, j);
                const [offset, length] = tokenStr.split(',').map(Number);

                if (offset === 0 && length === 1) {
                    res += '(';
                } else {
                    const start = res.length - offset;
                    for (let k = 0; k < length; k++) {
                        res += res[start + k];
                    }
                }

                i = j + 1;
            } else {
                res += compressedText[i];
                i++;
            }
        }

        return res;
    }
}

// MIX
class LZ77Huffman {
    static encode(text) {
        const lz77Text = LZ77.encode(text, 4096, 4);
        const huffman = HuffmanCoding.encode(lz77Text);

        return {
            lz77: lz77Text,
            huffman: huffman,
            mixed: huffman.compactStr,
            decodedText: LZ77.decode(
                HuffmanCoding.decodePacked(
                    HuffmanCoding.compactStrToBytes(huffman.compactStr, huffman.byteLength),
                    huffman.bitLength,
                    huffman.tree
                )
            )
        };
    }
}


copyBtn.addEventListener("click", () => {
    const text = inputText.value;
    outputText.textContent = text;
    outputLength.textContent = "原始字串長度 : " + text.length;
    lengthSummary.textContent = text.length + " 字元";

    const rleResult = RLE(text);
    const DeRLEResult = DeRLE(rleResult);
    RLEoutputText.textContent = rleResult;
    RLElength.textContent = "RLE 長度 : " + rleResult.length;
    RLElengthSummary.textContent = rleResult.length + " 字元";
    DeRLEText.textContent = "還原後 : " + DeRLEResult;

    const rawString = text;
    const hufResult = HuffmanCoding.encode(rawString);

    HUFoutputText.textContent = hufResult.compactStr;
    HUFlength.textContent = "霍夫曼長度 : " + hufResult.compactStr.length;
    HUFlengthSummary.textContent = hufResult.compactStr.length + " 字元";

    const recoveredPackedData = HuffmanCoding.compactStrToBytes(
        hufResult.compactStr,
        hufResult.byteLength
    );
    const decodedRawStr = HuffmanCoding.decodePacked(
        recoveredPackedData,
        hufResult.bitLength,
        hufResult.tree
    );

    DeHUF.textContent = "還原後 : " + decodedRawStr;

    const lz77Tokens = LZ77.encode(text, 4096, 4);
    const lz77Decoded = LZ77.decode(lz77Tokens);
    const lz77Text = JSON.stringify(lz77Tokens);

    LZ77outputText.textContent = lz77Text;
    LZ77length.textContent = "LZ77 長度 : " + lz77Text.length;
    LZ77lengthSummary.textContent = lz77Text.length + " 字元";
    DeLZ77.textContent = "還原後 : " + lz77Decoded;

    const mixedResult = LZ77Huffman.encode(text);
    MIXoutputText.textContent = mixedResult.mixed;
    MIXlength.textContent = "LZ77 + Huffman 長度 : " + mixedResult.mixed.length;
    MIXlengthSummary.textContent = mixedResult.mixed.length + " 字元";
    DeMIX.textContent = "還原後 : " + mixedResult.decodedText;
});