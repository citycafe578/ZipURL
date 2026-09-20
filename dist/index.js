// src/index.js
var runZipURL = /* @__PURE__ */ (function() {
  const RLE = {
    encode(text) {
      if (!text) return "";
      let res = "", cnt = 1;
      for (let i = 1; i <= text.length; i++) {
        if (i < text.length && text[i] === text[i - 1]) {
          cnt++;
          continue;
        }
        res += cnt + "#" + text[i - 1];
        cnt = 1;
      }
      return res;
    },
    decode(text) {
      if (!text) return "";
      let res = "", len = text.length, i = 0;
      while (i < len) {
        let cnt = 0;
        while (i < len && text[i] >= "0" && text[i] <= "9") {
          cnt = cnt * 10 + (text[i] - "0");
          i++;
        }
        if (i < len && text[i] === "#") i++;
        if (i < len) {
          res += text[i].repeat(cnt || 1);
          i++;
        }
      }
      return res;
    }
  };
  class HuffmanNode {
    constructor(char, freq, left = null, right = null) {
      this.char = char;
      this.freq = freq;
      this.left = left;
      this.right = right;
    }
  }
  const Huffman = {
    getFreqMap(text) {
      const freqMap = {};
      for (const char of text) freqMap[char] = (freqMap[char] || 0) + 1;
      return freqMap;
    },
    buildTree(text) {
      const nodes = Object.entries(this.getFreqMap(text)).map(([char, freq]) => new HuffmanNode(char, freq));
      if (nodes.length === 0) return null;
      if (nodes.length === 1) return new HuffmanNode(null, nodes[0].freq, nodes[0], null);
      while (nodes.length > 1) {
        nodes.sort((a, b) => a.freq - b.freq);
        const left = nodes.shift(), right = nodes.shift();
        nodes.push(new HuffmanNode(null, left.freq + right.freq, left, right));
      }
      return nodes[0];
    },
    buildCodeTable(root) {
      const codeTable = {};
      function traverse(node, currentCode) {
        if (!node) return;
        if (!node.left && !node.right) {
          codeTable[node.char] = currentCode || "0";
          return;
        }
        traverse(node.left, currentCode + "0");
        traverse(node.right, currentCode + "1");
      }
      traverse(root, "");
      return codeTable;
    },
    packBits(encoded) {
      if (!encoded) return { data: new Uint8Array(), bitLength: 0 };
      const bitLength = encoded.length;
      const data = new Uint8Array(Math.ceil(bitLength / 8));
      for (let i = 0; i < bitLength; i++) {
        if (encoded[i] === "1") {
          data[Math.floor(i / 8)] |= 1 << 7 - i % 8;
        }
      }
      return { data, bitLength };
    },
    unpackBits(data, bitLength) {
      let encoded = "";
      for (let i = 0; i < bitLength; i++) {
        encoded += data[Math.floor(i / 8)] >> 7 - i % 8 & 1 ? "1" : "0";
      }
      return encoded;
    },
    bytesToCompactStr(bytes) {
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    },
    compactStrToBytes(str, byteLength) {
      const binary = atob(str), bytes = new Uint8Array(byteLength);
      for (let i = 0; i < byteLength; i++) bytes[i] = binary.charCodeAt(i) || 0;
      return bytes;
    },
    encode(text) {
      if (!text) return "";
      const tree = this.buildTree(text);
      const table = this.buildCodeTable(tree);
      let encoded = "";
      for (const char of text) encoded += table[char];
      const packedResult = this.packBits(encoded);
      const compactStr = this.bytesToCompactStr(packedResult.data);
      const header = packedResult.bitLength + ";" + JSON.stringify(table);
      return header + "|" + compactStr;
    },
    decode(compressedText) {
      if (!compressedText) return "";
      const splitIdx = compressedText.indexOf("|");
      const header = compressedText.slice(0, splitIdx);
      const compactStr = compressedText.slice(splitIdx + 1);
      const [bitLenStr, tableStr] = header.split(";");
      const bitLength = parseInt(bitLenStr, 10);
      const table = JSON.parse(tableStr);
      const byteLength = Math.ceil(bitLength / 8);
      const revTable = {};
      for (const [char, code] of Object.entries(table)) revTable[code] = char;
      const bytes = this.compactStrToBytes(compactStr, byteLength);
      const encodedBits = this.unpackBits(bytes, bitLength);
      let decoded = "", currentBits = "";
      for (const bit of encodedBits) {
        currentBits += bit;
        if (revTable.hasOwnProperty(currentBits)) {
          decoded += revTable[currentBits];
          currentBits = "";
        }
      }
      return decoded;
    }
  };
  const LZ77 = {
    encode(text, windowSize = 255, minMatch = 3) {
      if (!text) return "";
      let res = "", i = 0, len = text.length;
      while (i < len) {
        let maxMatchLength = 0, bestOffset = 0;
        for (let j = Math.max(0, i - windowSize); j < i; j++) {
          let matchLen = 0;
          while (i + matchLen < len && text[j + matchLen] === text[i + matchLen]) matchLen++;
          if (matchLen > maxMatchLength) {
            maxMatchLength = matchLen;
            bestOffset = i - j;
          }
        }
        if (maxMatchLength >= minMatch) {
          res += `(${bestOffset},${maxMatchLength})`;
          i += maxMatchLength;
        } else {
          res += text[i] === "(" ? "(0,1)" : text[i];
          i++;
        }
      }
      return res;
    },
    decode(compressedText) {
      if (!compressedText) return "";
      let res = "", i = 0, len = compressedText.length;
      while (i < len) {
        if (compressedText[i] === "(") {
          let j = i + 1;
          while (j < len && compressedText[j] !== ")") j++;
          const [offset, length] = compressedText.slice(i + 1, j).split(",").map(Number);
          if (offset === 0 && length === 1) res += "(";
          else {
            const start = res.length - offset;
            for (let k = 0; k < length; k++) res += res[start + k];
          }
          i = j + 1;
        } else {
          res += compressedText[i++];
        }
      }
      return res;
    }
  };
  const MIX = {
    encode(text) {
      return Huffman.encode(LZ77.encode(text, 4096, 4));
    },
    decode(compressedText) {
      return LZ77.decode(Huffman.decode(compressedText));
    }
  };
  const JsonPacker = {
    encode(text) {
      try {
        let getKeyIndex = function(key) {
          if (!keyMap.has(key)) {
            keyMap.set(key, keyList.length);
            keyList.push(key);
          }
          return keyMap.get(key);
        }, processNode = function(node) {
          if (node === null || typeof node !== "object") return node;
          if (Array.isArray(node)) {
            if (node.length === 0) return [];
            const isObjArr = node.every((item) => item && typeof item === "object" && !Array.isArray(item));
            if (isObjArr && node.length > 1) {
              const keys = Array.from(new Set(node.flatMap(Object.keys)));
              const keyIndices = keys.map((k) => getKeyIndex(k));
              const rows = node.map((item) => keys.map((k) => item[k] !== void 0 ? processNode(item[k]) : null));
              return [-1, keyIndices, ...rows];
            }
            return node.map(processNode);
          }
          const packedObj = {};
          for (const [k, v] of Object.entries(node)) packedObj[getKeyIndex(k)] = processNode(v);
          return packedObj;
        };
        const data = JSON.parse(text);
        const keyList = [];
        const keyMap = /* @__PURE__ */ new Map();
        return JSON.stringify([keyList, processNode(data)]);
      } catch (e) {
        return null;
      }
    },
    decode(packedStr) {
      const [keyList, packedData] = JSON.parse(packedStr);
      function restoreNode(node) {
        if (node === null || typeof node !== "object") return node;
        if (Array.isArray(node)) {
          if (node[0] === -1) {
            const keys = node[1].map((idx) => keyList[idx]);
            return node.slice(2).map((row) => {
              const obj = {};
              keys.forEach((key, i) => {
                if (row[i] !== null && row[i] !== void 0) obj[key] = restoreNode(row[i]);
              });
              return obj;
            });
          }
          return node.map(restoreNode);
        }
        const restoreObj = {};
        for (const [keyIdx, val] of Object.entries(node)) {
          restoreObj[keyList[Number(keyIdx)]] = restoreNode(val);
        }
        return restoreObj;
      }
      return JSON.stringify(restoreNode(packedData));
    }
  };
  return {
    // 壓縮代號
    compress: function(text, prefix = "") {
      if (!text) return "";
      const results = [];
      results.push({ id: "RW", data: text });
      results.push({ id: "RL", data: RLE.encode(text) });
      results.push({ id: "HF", data: Huffman.encode(text) });
      results.push({ id: "LZ", data: LZ77.encode(text) });
      results.push({ id: "MX", data: MIX.encode(text) });
      const jsonPacked = JsonPacker.encode(text);
      if (jsonPacked) {
        results.push({ id: "JP", data: jsonPacked });
        results.push({ id: "JH", data: Huffman.encode(jsonPacked) });
        results.push({ id: "JL", data: LZ77.encode(jsonPacked) });
        results.push({ id: "JM", data: MIX.encode(jsonPacked) });
      }
      results.sort((a, b) => a.data.length - b.data.length);
      const best = results[0];
      const compressedText = best.id + best.data;
      if (!prefix) return compressedText;
      return `P${prefix.length}:${prefix}${compressedText}`;
    },
    decompress: function(compressedText) {
      if (!compressedText) return "";
      if (compressedText[0] === "P") {
        const separatorIndex = compressedText.indexOf(":", 1);
        const prefixLength = Number(compressedText.slice(1, separatorIndex));
        if (separatorIndex > 1 && Number.isInteger(prefixLength) && prefixLength >= 0) {
          compressedText = compressedText.slice(separatorIndex + 1 + prefixLength);
        }
      }
      if (compressedText.length < 2) return compressedText;
      const id = compressedText.slice(0, 2);
      const data = compressedText.slice(2);
      switch (id) {
        case "RW":
          return data;
        case "RL":
          return RLE.decode(data);
        case "HF":
          return Huffman.decode(data);
        case "LZ":
          return LZ77.decode(data);
        case "MX":
          return MIX.decode(data);
        case "JP":
          return JsonPacker.decode(data);
        case "JH":
          return JsonPacker.decode(Huffman.decode(data));
        case "JL":
          return JsonPacker.decode(LZ77.decode(data));
        case "JM":
          return JsonPacker.decode(MIX.decode(data));
        default:
          return compressedText;
      }
    }
  };
})();
var index_default = runZipURL;
var { compress, decompress } = runZipURL;
export {
  compress,
  decompress,
  index_default as default
};
