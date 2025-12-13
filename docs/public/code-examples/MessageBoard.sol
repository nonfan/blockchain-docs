// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MessageBoard {
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    Message[] private messages;

    event MessagePosted(
        address indexed sender,
        string content,
        uint256 timestamp
    );

    function postMessage(string calldata content) external {
        require(bytes(content).length > 0, "Empty message");
        require(bytes(content).length <= 280, "Message too long");

        messages.push(
            Message({
                sender: msg.sender,
                content: content,
                timestamp: block.timestamp
            })
        );

        emit MessagePosted(msg.sender, content, block.timestamp);
    }

    function getMessage(
        uint256 index
    ) external view returns (address, string memory, uint256) {
        Message storage m = messages[index];
        return (m.sender, m.content, m.timestamp);
    }

    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }
}
