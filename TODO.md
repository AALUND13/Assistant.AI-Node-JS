# TODO

- [x] Lua Sandbox
    - [x] Implement Lua Sandbox
    - [x] Implement a custom Print/Sleep function

    - [x] Implement a custom FS (File System) module

    - [x] Implement a custom OS module

- [ ] User Lau Sandbox
    - [x] Implement a files saving/loading system for each user

    - [ ] Implement a interface to the discord bot
        - [ ] Implement a `sendMessage(content, ephemeral): MessageObject` function
        - [ ] Implement a `addReaction(message, emoji | reactionID): void` function

        - [ ] Implement a `editMessage(message, content): void` function
        - [ ] Implement a `deleteMessage(message): void` function

- [x] Virtual File System
    - [x] Implement Extra File System functions
        - [x] Implement a `copyNode(source, destination): FileSystemNode` function
        - [x] Implement a `moveNode(source, destination): FileSystemNode` function
        - [x] Implement a `renameNode(source, name): FileSystemNode` function

        - [x] implement a `loadFromDisk(name, path): FileSystemNode` function

    - [x] Implement a `readOnly` flag for FileSystemNode