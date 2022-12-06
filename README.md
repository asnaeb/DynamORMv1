# DynamORM Client

```
npm i dynamorm
```
DynamORM is a Javascript/Typescript ORM Client for [AWS DynamoDB](https://). 
It provides clean and powerful OOP APIs to productively work with DynamoDB form Node.js

## Example
The following example shows a DynamORM class which stores `.txt` and `.jpeg` files objects on DynamoDB and provides 
utility methods to work with them.

```typescript
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {DynamORMClient, Table} from 'dynamorm'

const {Connect, HashKey, RangeKey, Attribute} = new DynamORMClient({/* DynamoDB Config */})

@Connect({TableName: 'Files'})
class FileItem extends Table {
    @HashKey.S()
    name: string

    @RangeKey.S()
    extension: '.txt' | '.jpeg'

    @Attribute.B()
    data?: Uint8Array

    @Attribute.S()
    encoding?: BufferEncoding

    get filename() {
        return this.name + this.extension
    }

    constructor(name: string, extension: '.txt' | '.jpeg') {
        super()
        this.name = name
        this.extension = extension
    }

    async writeFileToDisk(dir: string) {
        if (this.data) {
            await mkdir(dir, {recursive: true})
            return writeFile(dir + this.filename, this.data)
        }
    }

    async getDataFromDisk(path: string) {
        this.data = await readFile(path)
    }
    
    toString() {
        if (this.data) 
            return Buffer.from(this.data).toString(this.encoding)
    }
}
```
To use it, we just do
```typescript
const txt = new FileItem('example', '.txt')

txt.data = Buffer.from('This is an example text file')
txt.encoding = 'utf-8'

await txt.save()
```
```typescript
const jpg = new FileItem('example', '.jpg')

jpg.encoding = 'base64'
await jpg.getDataFromDisk('./path/to/some_image.jpg')

await jpg.save()
```
At this point, we have our items on DynamoDB. They can be retrieved from elsewhere like this
```typescript
const {Data} = await FileItem.select({'example': ['.txt', '.jpg']}).get()
```
Now we can write the files to disk
```typescript
if (Data) for (const file of Data) {
    await file.writeFileToDisk('./path/to/some_directory')
}
```
Or We can get a string representation of the file with the appropriate encoding
```typescript
const encodedTxt = Data?.[0].toString() // <- 'This is an example text file'
```
Or Update the content and save it back
```typescript
await Data?.[1]?.getDataFromDisk('./path/to/some_other_image.jpg')
await Data?.[1]?.save()
```
This was just a small,  non exhaustive example of what you can do with DynamORM. To get started, please see 
the [User Guide]().