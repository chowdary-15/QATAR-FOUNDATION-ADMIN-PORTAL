import cv2
import numpy as np

def find_document_contour(edges):
    """Find the largest quadrilateral contour in an edge map.
    Args: edges — binary edge map (output of Canny).
    Returns: (4,2) float32 array of corner points, or None if not found."""
    # Close small gaps in the edge map
    kernel  = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed  = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(
        closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return None

    # Sort largest-first, examine top 5
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for cnt in contours:
        peri   = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype('float32')
    return None

def draw_contour_debug(image, pts):
    """Draw contour and corner markers on a copy of the image.
    Args:
        image — original BGR image
        pts   — (4,2) array of corner points
    Returns: annotated BGR copy"""
    out = image.copy()
    pts_int = pts.astype(int)
    cv2.drawContours(out, [pts_int.reshape(-1,1,2)], -1, (0,200,0), 3)
    for x, y in pts_int:
        cv2.circle(out, (x, y), 10, (0, 0, 255), -1)
    return out
