import cv2
import numpy as np

def adaptive_threshold(gray, method: str = 'gaussian'):
    """Binarize a grayscale image using adaptive thresholding.
    Args:
        gray   — single-channel uint8 image
        method — 'gaussian' or 'mean'
    Returns: binary uint8 image (0 or 255)"""
    adaptive_method = (
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C if method == 'gaussian'
        else cv2.ADAPTIVE_THRESH_MEAN_C
    )
    return cv2.adaptiveThreshold(
        gray, 255, adaptive_method, cv2.THRESH_BINARY, 11, 10
    )

def apply_clahe(gray, clip_limit: float = 2.0,
                tile_grid: tuple = (8, 8)):
    """Enhance local contrast using CLAHE.
    Args:
        gray      — single-channel uint8 image
        clip_limit — threshold for contrast limiting
        tile_grid  — size of grid for histogram equalization
    Returns: contrast-enhanced grayscale image (uint8)"""
    clahe = cv2.createCLAHE(clipLimit=clip_limit,
                            tileGridSize=tile_grid)
    return clahe.apply(gray)

def generate_report(stages: dict, output_path: str) -> None:
    """Save a single image showing all pipeline stages side-by-side.
    Args:
        stages      — OrderedDict of {label: image} (grayscale or BGR)
        output_path — path to save the combined PNG"""
    target_h = 400
    panels   = []
    for label, img in stages.items():
        # Ensure BGR for consistency
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        h, w = img.shape[:2]
        scale = target_h / h
        img   = cv2.resize(img, (int(w * scale), target_h))
        cv2.putText(img, label, (8, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)
        panels.append(img)
    cv2.imwrite(output_path, np.hstack(panels))
    print(f'Pipeline report saved: {output_path}')
