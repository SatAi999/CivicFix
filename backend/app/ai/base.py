from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseVisionAnalyzer(ABC):
    @abstractmethod
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze an image and extract structured civic intelligence:
        - detected category
        - subcategory
        - detected objects
        - hazards
        - severity guess
        - confidence
        - description
        """
        pass

class BaseSeverityEngine(ABC):
    @abstractmethod
    def calculate_severity(self, issue_data: Dict[str, Any], supporters_count: int = 0) -> Dict[str, Any]:
        """
        Calculate transparent severity priority based on category, hazards, location, support.
        Returns:
        - severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        - explanation: List[str] of reasons
        - score: Float
        """
        pass

class BaseDuplicateDetector(ABC):
    @abstractmethod
    def find_duplicates(self, new_issue_data: Dict[str, Any], active_issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Determine if the new issue is a duplicate of any existing active issue.
        """
        pass

class BaseRoutingEngine(ABC):
    @abstractmethod
    def route_issue(self, category_id: int, ward: str = None) -> int:
        """
        Determine the department ID responsible for resolving the issue.
        """
        pass

class BaseHotspotAnalyzer(ABC):
    @abstractmethod
    def detect_hotspots(self, active_issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect emerging problem areas using geographical and semantic clustering.
        """
        pass

class BaseResolutionComparator(ABC):
    @abstractmethod
    def compare_resolution(self, before_path: str, after_path: str) -> Dict[str, Any]:
        """
        Compare the original evidence photo and resolution photo.
        """
        pass
