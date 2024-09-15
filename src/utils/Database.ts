import * as fs from 'fs';
type PathLike = fs.PathLike;

class Database<T> {
    public data: T;
    private fileName: PathLike;

    constructor(fileName: PathLike, defaultData: T) {
        this.fileName = fileName;

        if (fs.existsSync(fileName)) {
            const data = fs.readFileSync(fileName, 'utf8');
            this.data = data ? JSON.parse(data) : defaultData;
        } else {
            this.data = defaultData;
            this.write();
        }
    }

    public write() {
        fs.writeFileSync(this.fileName, JSON.stringify(this.data, null, 2));
    }

    public get<K extends keyof T>(key: K): T[K] {
        return this.data[key];
    }

    public set(key: keyof T, value: any): void {
        this.data[key] = value;
        this.write();
    }

    public delete(key: keyof T): void {
        delete this.data[key];
        this.write();
    }

    public update<K extends keyof T>(key: K, updateFn: (value: T[K]) => T[K]): void {
        if (this.data[key] !== undefined) {
            this.data[key] = updateFn(this.data[key]);
            this.write();
        }
    }
}

export default Database;
