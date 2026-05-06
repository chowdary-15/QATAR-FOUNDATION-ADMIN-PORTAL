import cv2, argparse, sys, os

SUPPORTED = {'.jpg', '.jpeg', '.png'}

def load_image(path: str):
    """Load a BGR image from disk.
    Args:  path (str) — path to image file.
    Returns: numpy.ndarray (H x W x 3, uint8, BGR).
    Raises: FileNotFoundError, ValueError for unsupported formats."""
    if not os.path.isfile(path):
        raise FileNotFoundError(f'File not found: {path}')
    ext = os.path.splitext(path)[1].lower()
    if ext not in SUPPORTED:
        raise ValueError(f'Unsupported format {ext}. Use: {SUPPORTED}')
    img = cv2.imread(path)
    if img is None:
        raise IOError(f'OpenCV failed to read: {path}')
    return img

def save_image(image, path: str) -> None:
    """Write image to disk, creating parent directories as needed."""
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    cv2.imwrite(path, image)

def resize_to_width(image, max_width: int = 1024):
    """Resize image to max_width preserving aspect ratio."""
    h, w = image.shape[:2]
    if w <= max_width:
        return image
    scale = max_width / w
    return cv2.resize(image, (max_width, int(h * scale)),
                      interpolation=cv2.INTER_AREA)

def display_image(title: str, image) -> None:
    """Show image in a window; press any key to close."""
    cv2.imshow(title, image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
