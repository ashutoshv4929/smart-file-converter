const fs = require('fs');
const libre = require('libreoffice-convert');

const inputPath = './uploads/test.docx';
const outputPath = './uploads/test.pdf';

fs.readFile(inputPath, (err, input) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  libre.convert(input, '.pdf', undefined, (err, done) => {
    if (err) {
      console.error('Conversion error:', err);
      return;
    }

    fs.writeFile(outputPath, done, (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('Conversion successful!');
    });
  });
});
