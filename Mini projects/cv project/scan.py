import argparse, sys, cv2
from collections import OrderedDict
from utils.io_utils   import load_image, save_image, resize_to_width, display_image
from utils.preprocess import to_gray, blur_image, detect_edges
from utils.detect     import find_document_contour, draw_contour_debug
from utils.warp       import four_point_transform
from utils.enhance    import adaptive_threshold, apply_clahe, generate_report

def parse_args():
    p = argparse.ArgumentParser(description='Smart Document Scanner')
    p.add_argument('--input',        required=True)
    p.add_argument('--output-dir',   default='output')
    p.add_argument('--debug',        action='store_true')
    p.add_argument('--no-warp',      action='store_true')
    p.add_argument('--enhance-only', action='store_true')
    return p.parse_args()

def main():
    args  = parse_args()
    out   = args.output_dir
    img   = resize_to_width(load_image(args.input))
    stages = OrderedDict()
    stages['Original'] = img

    gray    = to_gray(img)
    blurred = blur_image(gray, 'gaussian', 5)
    edges   = detect_edges(blurred, 50, 150)
    stages['Edges'] = edges
    save_image(edges, f'{out}/debug_edges.jpg')

    pts = find_document_contour(edges)
    if pts is None:
        print('WARNING: No document quadrilateral found.')
        warped = img
    else:
        debug_cnt = draw_contour_debug(img, pts)
        save_image(debug_cnt, f'{out}/debug_contour.jpg')
        stages['Contour'] = debug_cnt
        warped = four_point_transform(img, pts)
        save_image(warped, f'{out}/scan_warped.jpg')
        stages['Warped'] = warped

    warped_gray = to_gray(warped)
    binary      = adaptive_threshold(warped_gray, 'gaussian')
    clahe_img   = apply_clahe(warped_gray)
    save_image(binary,    f'{out}/scan_binary.jpg')
    save_image(clahe_img, f'{out}/scan_clahe.jpg')
    stages['Binary'] = binary
    stages['CLAHE']  = clahe_img

    generate_report(stages, f'{out}/pipeline_report.png')
    print('Done.')

if __name__ == '__main__':
    main()
