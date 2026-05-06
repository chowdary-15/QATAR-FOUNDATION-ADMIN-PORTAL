import cv2
import numpy as np

def order_points(pts):
    """Order four points as [top-left, top-right, bottom-right, bottom-left].
    Args: pts — (4,2) float32 array of unordered corner points.
    Returns: (4,2) float32 array in TL, TR, BR, BL order."""
    rect = np.zeros((4, 2), dtype='float32')
    s    = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    rect[0] = pts[np.argmin(s)]     # top-left     (smallest x+y)
    rect[2] = pts[np.argmax(s)]     # bottom-right (largest  x+y)
    rect[1] = pts[np.argmin(diff)]  # top-right    (smallest x-y)
    rect[3] = pts[np.argmax(diff)]  # bottom-left  (largest  x-y)
    return rect

def four_point_transform(image, pts):
    """Warp a quadrilateral region to a flat top-down rectangle.
    Args:
        image — source BGR image
        pts   — (4,2) float32 corner points (any order)
    Returns: warped BGR image with A4 proportions."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute output width = max of top and bottom edge lengths
    wA = np.linalg.norm(br - bl)
    wB = np.linalg.norm(tr - tl)
    max_width = int(max(wA, wB))

    # Force A4 height (1:1.414 ratio)
    max_height = int(max_width * 1.414)

    # Destination rectangle in pixel space
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1],
    ], dtype='float32')

    M       = cv2.getPerspectiveTransform(rect, dst)
    warped  = cv2.warpPerspective(image, M, (max_width, max_height))
    return warped
