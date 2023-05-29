import { CAREncoderStream, createDirectoryEncoderStream } from 'ipfs-car'
import type { FileEntry } from '../types'
import { CID, Link } from 'multiformats'
import { tmpdir } from 'node:os'
import { readFile, open } from 'node:fs/promises'
import { Writable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { CarWriter } from '@ipld/car/writer'

const tmp = tmpdir()

export const packCAR = async (files: FileEntry[], folder: string) => {
  const output = `${tmp}/${folder}.car`
  const placeholderCID = CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
  let rootCID: CID<unknown, number, number, 1>
  await createDirectoryEncoderStream(files).pipeThrough(new TransformStream({
    transform (block, controller) {
      rootCID = block.cid as CID<unknown, number, number, 1>
      controller.enqueue(block)
    }
  }))
  .pipeThrough(new CAREncoderStream([placeholderCID]))
  .pipeTo(Writable.toWeb(createWriteStream(output)))

  const fd = await open(output, 'r+')
  await CarWriter.updateRootsInFile(fd, [rootCID!])
  await fd.close()

  const file = await readFile(output)
  const blob = new Blob([file], { type: 'application/vnd.ipld.car' })
  return blob
}
