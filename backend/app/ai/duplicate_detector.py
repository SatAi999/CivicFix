import math
import os
import cv2
import numpy as np
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from .base import BaseDuplicateDetector

class DuplicateDetector(BaseDuplicateDetector):
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance in meters between two points 
        on the earth (specified in decimal degrees).
        """
        # convert decimal degrees to radians 
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        # haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a)) 
        r = 6371000 # Radius of earth in meters
        return c * r

    def compute_dhash(self, image_path: str) -> np.ndarray | None:
        """
        Compute a 64-bit Difference Hash (dHash) for an image to determine visual similarity.
        """
        if not os.path.exists(image_path):
            return None
        try:
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return None
            # Resize to 9x8 to compute difference between adjacent pixels horizontally
            resized = cv2.resize(img, (9, 8), interpolation=cv2.INTER_AREA)
            # Compute difference between columns
            diff = resized[:, 1:] > resized[:, :-1]
            return diff.flatten()
        except Exception as e:
            print(f"Error computing image hash: {e}")
            return None

    def hash_similarity(self, hash1: np.ndarray, hash2: np.ndarray) -> float:
        """
        Compute similarity score [0, 1] based on Hamming distance of two 64-bit difference hashes.
        """
        if hash1 is None or hash2 is None:
            return 0.0
        hamming_dist = np.count_nonzero(hash1 != hash2)
        # 64 bits total
        similarity = 1.0 - (hamming_dist / 64.0)
        return similarity

    def semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two description texts using TF-IDF.
        """
        if not text1.strip() or not text2.strip():
            return 0.0
        try:
            vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b')
            tfidf = vectorizer.fit_transform([text1, text2])
            pairwise_similarity = (tfidf * tfidf.T).toarray()
            return float(pairwise_similarity[0, 1])
        except Exception as e:
            # Fallback to simple word intersection if TF-IDF fails (e.g., vocabulary empty)
            w1 = set(text1.lower().split())
            w2 = set(text2.lower().split())
            if not w1 or not w2:
                return 0.0
            return len(w1.intersection(w2)) / math.sqrt(len(w1) * len(w2))

    def find_duplicates(self, new_issue_data: Dict[str, Any], active_issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Checks a new issue's location, text, and media against existing active issues.
        Returns a list of matching duplicates sorted by similarity score.
        """
        new_lat = new_issue_data.get("latitude")
        new_lng = new_issue_data.get("longitude")
        new_text = new_issue_data.get("description", "")
        new_cat = new_issue_data.get("category_name", "")
        new_image = new_issue_data.get("image_path")
        
        new_hash = self.compute_dhash(new_image) if new_image else None
        
        suggestions = []
        
        for issue in active_issues:
            # Step 1: Distance check
            dist = self.haversine_distance(new_lat, new_lng, issue["latitude"], issue["longitude"])
            
            # If farther than 150m, skip duplicate check
            if dist > 150.0:
                continue
                
            # Proximity Score [0, 1]
            if dist <= 10.0:
                proximity_score = 1.0
            else:
                proximity_score = max(0.0, 1.0 - (dist - 10.0) / 140.0)
                
            # Step 2: Semantic description check
            semantic_score = self.semantic_similarity(new_text, issue.get("description", ""))
            
            # Step 3: Visual check
            visual_score = 0.0
            issue_image = issue.get("image_path")
            if new_hash is not None and issue_image:
                issue_hash = self.compute_dhash(issue_image)
                if issue_hash is not None:
                    visual_score = self.hash_similarity(new_hash, issue_hash)
            
            # Step 4: Category exact match bonus
            cat_match = (new_cat == issue.get("category_name"))
            cat_bonus = 0.15 if cat_match else 0.0
            
            # Compute composite similarity score
            # If we have image hash comparison, use visual, else rely heavily on spatial + text
            if new_hash is not None and issue_image and visual_score > 0.0:
                score = (0.35 * proximity_score) + (0.30 * semantic_score) + (0.35 * visual_score)
            else:
                score = (0.55 * proximity_score) + (0.45 * semantic_score)
                
            # Apply category bonus and clamp
            score = min(1.0, score + cat_bonus)
            
            # Flag as suggestion if score is significant (e.g., > 0.60)
            if score > 0.60:
                suggestions.append({
                    "primary_issue_id": issue["id"],
                    "title": issue["title"],
                    "distance_meters": round(dist, 1),
                    "similarity_score": round(score, 2),
                    "status": issue["status"],
                    "category_match": cat_match,
                    "media_url": issue.get("media_url")
                })
                
        # Sort by similarity descending
        suggestions.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return {
            "is_duplicate": len(suggestions) > 0,
            "suggestions": suggestions
        }

duplicate_detector = DuplicateDetector()
