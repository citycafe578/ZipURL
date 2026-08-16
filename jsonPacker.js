const JsonTest = document.getElementById("JsonTest");
const JsonLength = document.getElementById("JsonLength");
const DeJson = document.getElementById("Dejson");

const inputText = document.getElementById("inputText");
const copyBtn = document.getElementById("copyBtn");
const outputText = document.getElementById("outputText");
const outputLength = document.getElementById("length");
const lengthSummary = document.getElementById("length-summary");


class UniversalJsonPacker{
    static pack(data){
        const keyList = [];
        const keyMap = new Map();
        
        function getKeyIndex(key){
            if(!keyMap.has(key)){
                keyMap.set(key, keyList.length);
                keyList.push(key);
            }
            return keyMap.get(key);
        }

        function processNode(node){
            if(node === null || typeof node !== "object"){
                return node;
            }else{
                if(Array.isArray(node)){
                    if(node.length === 0){
                        return [];
                    }

                    const isObjectArray = node.every(item => item && typeof item === "object" && !Array.isArray(item));
                    if(isObjectArray && node.length > 1){
                        const keys = Array.from(new Set(node.flatMap(Object.keys)));
                        const keyIndices = keys.map(k => getKeyIndex(k));
                        const rows = node.map(item => keys.map(k => item[k] !== undefined ? processNode(item[k]) : null));
                        return [-1, keyIndices, ...rows];
                    }
                    return node.map(processNode);
                }
                const packedObj = {};
                for(const [k, v] of Object.entries(node)){
                    packedObj[getKeyIndex(k)] = processNode(v);
                }
                return packedObj;
            }
        }

        const packedData = processNode(data);
        return JSON.stringify([keyList, packedData]);
    }
    
    static unpack(packedStr){
        const [keyList, packedData] = JSON.parse(packedStr);

        function restoreNode(node){
            if(node === null || typeof node !== "object"){
                return node;
            }else if(Array.isArray(node)){
                if(node[0] === -1){
                    const keyIndices = node[1];
                    const keys = keyIndices.map(idx => keyList[idx]);
                    const rows = node.slice(2);
                    return rows.map(row => {
                        const obj = {};
                        keys.forEach((key, i) => {
                            const val = row[i];
                            if(val !== null && val !== undefined){
                                obj[key] = restoreNode(val);
                            }
                        });
                        return obj;
                    });
                }
                return node.map(restoreNode);
            }
            const restoreObj = {};
            for(const [keyIdx, val] of Object.entries(node)){
                const originalKey = keyList[Number(keyIdx)];
                restoreObj[originalKey] = restoreNode(val);
            }
            return restoreObj;
        }
        return restoreNode(packedData);
    }
}

copyBtn.addEventListener("click", () => {
    const text = inputText.value;
    if(!text) return;

    let parsedJson;
    try {
        parsedJson = JSON.parse(text);
    } catch(e) {
        alert("請輸入合法的 JSON 字串！");
        return;
    }

    const jsonPackResult = UniversalJsonPacker.pack(parsedJson);
    const DeJsonpack = UniversalJsonPacker.unpack(jsonPackResult);

    if (JsonTest) JsonTest.textContent = jsonPackResult;
    if (JsonLength) JsonLength.textContent = "JsonPacker 長度 : " + jsonPackResult.length;
    if (lengthSummary) lengthSummary.textContent = jsonPackResult.length + " 字元";
    if (DeJson) DeJson.textContent = "還原後 : " + JSON.stringify(DeJsonpack);
});