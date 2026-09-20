# ZipURL

**ZipURL** is a lightweight JavaScript text compression library that automatically selects the shortest representation from multiple compression strategies.

Instead of relying on a single compression algorithm, ZipURL tries several encoders, compares the resulting string lengths, and stores the shortest result together with a compact two-character algorithm identifier.

## Features

- Multiple compression algorithms in one library
- Automatic selection of the shortest encoded result
- Support for ordinary text
- Specialized JSON compression
- Hybrid compression pipelines
- Prefix preservation
- Simple `compress()` / `decompress()` API
- ES module support
- No runtime dependencies

## Supported Compression Methods

| ID | Method | Description |
|---|---|---|
| `RW` | Raw | Original uncompressed text |
| `RL` | RLE | Run-Length Encoding |
| `HF` | Huffman | Frequency-based variable-length coding |
| `LZ` | LZ77 | Sliding-window dictionary compression |
| `MX` | Huffman + LZ77 | LZ77 followed by Huffman coding |
| `JP` | JSON | JSON key deduplication and structural packing |
| `JH` | JSON + Huffman | JSON packing followed by Huffman |
| `JL` | JSON + LZ77 | JSON packing followed by LZ77 |
| `JM` | JSON + Huffman + LZ77 | JSON packing followed by the hybrid compressor |

For every input, ZipURL generates the applicable representations and selects the one with the smallest `data.length`.

## How It Works

The main `compress()` function follows this process:

```text
Input
  │
  ├── Raw
  ├── RLE
  ├── Huffman
  ├── LZ77
  ├── Huffman + LZ77
  │
  └── If input is valid JSON
        ├── JSON packing
        ├── JSON + Huffman
        ├── JSON + LZ77
        └── JSON + Huffman + LZ77
                 │
                 ▼
        Compare encoded lengths
                 │
                 ▼
          Select shortest
                 │
                 ▼
        Add 2-character ID
                 │
                 ▼
             Output
```

The selected compression method is stored as a two-character prefix, allowing `decompress()` to determine which decoder should be used.

## Installation

ZipURL has no runtime dependencies. The package includes `tsup`, `typescript`, and `vitest` as development dependencies.

Install the package and import it:

```javascript
npm install zipurl
```

```javascript
import { compress, decompress } from "zipurl";
```

## Basic Usage

### Compress

```javascript
import { compress } from "zipurl";

const text = "AAAAABBBBBCCCCCCCCCCCC";

const compressed = compress(text);

console.log(compressed);
```

### Decompress

```javascript
import { decompress } from "zipurl";

const restored = decompress(compressed);

console.log(restored);
```

The following property should hold for valid inputs:

```javascript
decompress(compress(text)) === text
```

## Prefix Support

`compress()` accepts an optional `prefix` argument.

```javascript
const compressed = compress("hello world", "https://example.com/");
```

When a prefix is supplied, ZipURL stores it separately from the compressed payload:

```text
P<prefix length>:<prefix><compression ID><compressed data>
```

For example, the structure is conceptually:

```text
P20:https://example.com/...
```

During decompression, ZipURL removes the stored prefix before decoding the payload.

This makes it possible to preserve a URL-like prefix while still compressing the remaining content.

## Compression Algorithms

### RLE

Run-Length Encoding replaces consecutive identical characters with a count and the character.

Example:

```text
AAAAABB
```

becomes conceptually:

```text
5#A2#B
```

RLE is especially useful when the input contains long runs of repeated characters.

### Huffman Coding

ZipURL builds a frequency map for the input and constructs a Huffman tree.

The resulting character-to-bit mapping is stored together with the packed bit stream.

The encoded representation contains:

```text
<bit length>;<JSON code table>|<packed data>
```

The bit stream is packed into bytes before being converted into a compact string representation.

### LZ77

The LZ77 implementation uses a sliding window and searches previous input for the longest matching sequence.

The default parameters are:

```javascript
windowSize = 255
minMatch = 3
```

The hybrid compressor uses:

```javascript
windowSize = 4096
minMatch = 4
```

Matches are represented using:

```text
(offset,length)
```

A special `(0,1)` representation is used when the literal character itself is `(`.

### Huffman + LZ77

The hybrid compressor first applies LZ77 and then Huffman coding:

```javascript
Huffman.encode(LZ77.encode(text, 4096, 4))
```

Decompression reverses the order:

```javascript
LZ77.decode(Huffman.decode(compressedText))
```

## JSON Compression

ZipURL has a specialized JSON packer that attempts to reduce structural redundancy before applying the normal compressors.

For objects, property names are stored once in a shared key list and replaced by numeric indexes.

For arrays containing multiple objects, common keys can be represented as a column-like structure:

```text
[
    keyList,
    packedData
]
```

This is particularly useful for JSON containing many objects with repeated property names.

### JSON Compression Pipeline

For valid JSON, ZipURL tests:

```text
JSON packing
JSON + Huffman
JSON + LZ77
JSON + Huffman + LZ77
```

The shortest result is selected together with the corresponding ID.

If the input is not valid JSON, these JSON-specific candidates are simply skipped.

## Output Format

A normal compressed result has the following structure:

```text
<ID><data>
```

where `<ID>` is one of:

```text
RW
RL
HF
LZ
MX
JP
JH
JL
JM
```

For example:

```text
HF<encoded data>
```

The first two characters tell `decompress()` which decoding pipeline should be used.

### Prefix Format

When a prefix is provided:

```text
P<prefix length>:<prefix><ID><data>
```

This allows the decompressor to recover the prefix and then decode the compressed payload.

## API

### `compress(text, prefix = "")`

Compresses the supplied text and automatically selects the shortest supported representation.

```javascript
const result = compress(text);
```

Parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Text to compress |
| `prefix` | `string` | `""` | Optional prefix preserved outside the compressed payload |

Returns:

```javascript
string
```

If `text` is empty or falsy, an empty string is returned.

### `decompress(compressedText)`

Restores the original text.

```javascript
const text = decompress(compressedText);
```

Parameters:

| Parameter | Type | Description |
|---|---|---|
| `compressedText` | `string` | Output generated by `compress()` |

Returns:

```javascript
string
```

## Design Philosophy

ZipURL does not assume that one compression algorithm is always optimal.

Different data patterns favor different approaches:

```text
Repeated characters       → RLE
Frequency-heavy text      → Huffman
Repeated substrings       → LZ77
Mixed redundancy          → Huffman + LZ77
Structured JSON           → JSON packing
JSON + repeated patterns  → JSON + compression
```

Therefore, ZipURL treats compression as a selection problem:

```text
Generate candidates
        ↓
Measure encoded length
        ↓
Choose shortest representation
        ↓
Store algorithm ID
```

This approach prioritizes practical output size over committing to a single compression technique.

## Project Structure

The library source and package files are organized as follows:

```text
src/
├── index.js       # Library entry point and compression implementation
└── index.d.ts     # Public TypeScript declarations
scripts/
└── copy-types.mjs # Copies declarations into dist during build
test/
└── library.test.js
dist/              # Generated build output, ignored by Git
```

## Important Notes

- The current implementation compares candidates using JavaScript string `.length`, so the selection criterion is encoded string length rather than a formal byte-level storage measurement.
- Huffman output contains its code table as part of the encoded representation.
- JSON compression is only attempted when the input can be parsed successfully by `JSON.parse()`.
- Compression does not guarantee that the result will be shorter than the original input. The raw representation (`RW`) is included so that the shortest candidate can still be selected.
- This project is intended as a lightweight JavaScript compression experiment rather than a replacement for established binary compression formats such as gzip, Brotli, or Zstandard.

## Example

```javascript
import { compress, decompress } from "zipurl";

const original = JSON.stringify([
    { name: "Alice", age: 20, city: "Taipei" },
    { name: "Bob", age: 21, city: "Taipei" },
    { name: "Charlie", age: 22, city: "Taipei" }
]);

const compressed = compress(original);
const restored = decompress(compressed);

console.log("Original :", original.length);
console.log("Compressed:", compressed.length);
console.log("Restored :", restored);
console.log("Valid    :", restored === original);
```

## License

The package metadata declares the MIT license. Add a `LICENSE` file containing the MIT license text before publishing publicly.
