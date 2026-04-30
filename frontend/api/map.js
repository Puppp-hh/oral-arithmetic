"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSchools = searchSchools;
const request_1 = require("./request");
const api_1 = require("../constants/api");
function searchSchools(params, silent = false) {
    return (0, request_1.request)({
        url: api_1.API.MAP_SCHOOL_SEARCH,
        data: params,
        noToken: true,
        silent,
    });
}
