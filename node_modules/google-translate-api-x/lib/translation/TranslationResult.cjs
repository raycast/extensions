'use strict';
module.exports = class {
    text = '';
    pronunciation = undefined;
    from = {
        language: {
            didYouMean: undefined,
            iso: ''
        },
        text: {
            autoCorrected: undefined,
            value: '',
            didYouMean: undefined
        }
    };
    raw = undefined;
    constructor(raw) {
        this.raw = raw;
    }
};