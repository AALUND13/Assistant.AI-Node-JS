import * as fs from 'fs';

class Database<T> {
    public data: T;
    private fileName: string;

    constructor(fileName: string, defaultData: T) {
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

    public get(key: keyof T): any {
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

    public update(key: keyof T, updateFn: (value: any) => any): void {
        if (this.data[key] !== undefined) {
            this.data[key] = updateFn(this.data[key]);
            this.write();
        }
    }
}

export default Database;
