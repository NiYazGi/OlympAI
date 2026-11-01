// Renders rectangles of PDF pages to PNG, exactly as a viewer would draw them.
//
// The figure extractor in pdf-figures.mjs can only lift raster images out of a
// file. Most of the physics papers draw their circuits, graphs and tables as
// vector paths, and a path cannot be lifted — it has to be rendered. pdf.js
// needs a native canvas for that; CoreGraphics is already on every Mac, so this
// is the one place the importers lean on the operating system.
//
//   swift .tools/render-crops.swift < crops.json
//
// Input is a JSON array of { file, page, rect: [x0, y0, x1, y1], out, scale? }
// in PDF user space (origin bottom-left, points). One process for the whole
// batch: the compile step is the slow part.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Crop: Decodable {
  let file: String
  let page: Int
  let rect: [Double]
  let out: String
  let scale: Double?
}

let input = FileHandle.standardInput.readDataToEndOfFile()
let crops = try JSONDecoder().decode([Crop].self, from: input)

var documents: [String: CGPDFDocument] = [:]
var failed = 0

for crop in crops {
  let document = documents[crop.file] ?? CGPDFDocument(URL(fileURLWithPath: crop.file) as CFURL)
  guard let document, let page = document.page(at: crop.page), crop.rect.count == 4 else {
    FileHandle.standardError.write("cannot open \(crop.file) page \(crop.page)\n".data(using: .utf8)!)
    failed += 1
    continue
  }
  documents[crop.file] = document

  let scale = crop.scale ?? 3
  let (x0, y0, x1, y1) = (crop.rect[0], crop.rect[1], crop.rect[2], crop.rect[3])
  let width = Int(((x1 - x0) * scale).rounded(.up))
  let height = Int(((y1 - y0) * scale).rounded(.up))

  guard
    width > 0, height > 0,
    let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
  else {
    failed += 1
    continue
  }

  // Paper is white. A transparent crop would put black ink on a dark card.
  context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  context.interpolationQuality = .high
  context.scaleBy(x: scale, y: scale)
  context.translateBy(x: -x0, y: -y0)
  context.drawPDFPage(page)

  guard
    let image = context.makeImage(),
    let destination = CGImageDestinationCreateWithURL(
      URL(fileURLWithPath: crop.out) as CFURL, UTType.png.identifier as CFString, 1, nil)
  else {
    failed += 1
    continue
  }
  CGImageDestinationAddImage(destination, image, nil)
  if !CGImageDestinationFinalize(destination) { failed += 1 }
}

print("rendered \(crops.count - failed) of \(crops.count)")
exit(failed == 0 ? 0 : 1)
