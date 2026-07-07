/** @typedef {'text'|'date'|'checkbox'|'textarea'|'photo'|'signature'} PrintFieldType */

/**
 * @typedef {Object} PrintField
 * @property {number} page
 * @property {string} name - dot-path into formData
 * @property {PrintFieldType} type
 * @property {string} x
 * @property {string} y
 * @property {string} [w]
 * @property {string} [h]
 * @property {string} [fontSize]
 * @property {boolean} [adminOnly]
 * @property {boolean} [readOnly]
 */

export {};
