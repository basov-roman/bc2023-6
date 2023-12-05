function checkIfIdExists(idToCheck, jsonData) {
    return jsonData.some(item => item.id === idToCheck);
}

function findObjectById(idToFind, dataArray) {
    return dataArray.find(item => item.id === idToFind);
}

module.exports = { checkIfIdExists, findObjectById };