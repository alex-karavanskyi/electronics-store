import {
  ReadableStream,
  TextDecoderStream,
  TransformStream,
} from 'node:stream/web'
import { deserialize, serialize } from 'node:v8'

Object.assign(globalThis, {
  ReadableStream,
  TransformStream,
  TextDecoderStream,
  structuredClone: <T>(value: T): T => deserialize(serialize(value)),
})
