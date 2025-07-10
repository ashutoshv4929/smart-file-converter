"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var url_1 = require("url");
var path_1 = require("path");
var promises_1 = require("fs/promises");
var pdf_js_utils_1 = require("./server/services/conversion/pdf-js-utils");
var path = require("path");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
function testPdfConversion() {
    return __awaiter(this, void 0, void 0, function () {
        var testPdfPath, pdfPath, pageCount, images, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, 6, 7]);
                    testPdfPath = path.join(process.cwd(), 'test.pdf');
                    return [4 /*yield*/, promises_1.default.writeFile(testPdfPath, 'This is a test PDF content')];
                case 1:
                    _a.sent();
                    pdfPath = testPdfPath;
                    console.log('PDF को प्रोसेस कर रहा हूँ...');
                    return [4 /*yield*/, pdf_js_utils_1.PdfJsUtils.getPageCount(pdfPath)];
                case 2:
                    pageCount = _a.sent();
                    console.log("PDF \u092E\u0947\u0902 \u0915\u0941\u0932 ".concat(pageCount, " \u092A\u0947\u091C \u0939\u0948\u0902"));
                    // PDF को इमेज में कन्वर्ट करें
                    console.log('PDF को इमेज में कन्वर्ट कर रहा हूँ...');
                    return [4 /*yield*/, pdf_js_utils_1.PdfJsUtils.convertPdfToImages(pdfPath)];
                case 3:
                    images = _a.sent();
                    console.log('कन्वर्जन सफल! बनी हुई इमेजेस:');
                    console.log(images);
                    // सफाई
                    // Note: We don't have cleanup in PdfJsUtils, but we can delete the test file
                    return [4 /*yield*/, promises_1.default.unlink(testPdfPath)];
                case 4:
                    // सफाई
                    // Note: We don't have cleanup in PdfJsUtils, but we can delete the test file
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    error_1 = _a.sent();
                    console.error('त्रुटि हुई:', error_1);
                    return [3 /*break*/, 7];
                case 6:
                    process.exit(0);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// टेस्ट फंक्शन को चलाएं
testPdfConversion();
