import cv2
import numpy as np

def to_gray(image):
    """Convert BGR image to single-channel grayscale."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def blur_image(gray, method: str = 'gaussian', ksize: int = 5):
    """Blur a grayscale image to reduce noise.
    Args:
        gray   — single-channel uint8 image
        method — 'gaussian' | 'median' | 'bilateral'
        ksize  — kernel size (must be odd for gaussian/median)
    Returns: blurred grayscale image (uint8)"""
    ksize = ksize if ksize % 2 == 1 else ksize + 1  # enforce odd
    if method == 'gaussian':
        return cv2.GaussianBlur(gray, (ksize, ksize), 0)
    elif method == 'median':
        return cv2.medianBlur(gray, ksize)
    elif method == 'bilateral':
        return cv2.bilateralFilter(gray, ksize, 75, 75)
    else:
        raise ValueError(f'Unknown method: {method}')

def detect_edges(blurred, low: int = 50, high: int = 150):
    """Run Canny edge detection.
    Args:
        blurred — blurred grayscale image
        low     — lower hysteresis threshold (weak edges)
        high    — upper hysteresis threshold (strong edges)
    Returns: binary edge map (uint8, 0 or 255)"""
    return cv2.Canny(blurred, low, high)

def compare_blurs(gray, output_path: str = 'debug_blurs.jpg') -> None:
    """Save a 3-panel image comparing Gaussian, Median, and Bilateral blur."""
    results = []
    for method in ('gaussian', 'median', 'bilateral'):
        blurred = blur_image(gray, method, ksize=5)
        edges   = detect_edges(blurred)
        panel   = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        # label
        cv2.putText(panel, method.capitalize(), (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 0), 2)
        results.append(panel)
    combined = np.hstack(results)
    cv2.imwrite(output_path, combined)
    print(f'Saved blur comparison: {output_path}')
