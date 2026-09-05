"""
Input Validators
"""
import re
import ipaddress
import validators
from core.models import TargetType


class InputValidator:
    """Validate and auto-detect target types"""
    
    @staticmethod
    def detect_type(value: str) -> TargetType:
        """Auto-detect target type from input"""
        value = value.strip()
        
        # Check if IP
        try:
            ipaddress.ip_address(value)
            return TargetType.IP
        except ValueError:
            pass
        
        # Check if email
        if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            return TargetType.EMAIL
        
        # Check if URL
        if value.startswith(('http://', 'https://')):
            return TargetType.URL
        
        # Check if phone number
        if re.match(r'^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,15}$', value):
            return TargetType.PHONE
        
        # Check if hash (MD5, SHA1, SHA256)
        if re.match(r'^[a-fA-F0-9]{32}$', value):
            return TargetType.HASH
        if re.match(r'^[a-fA-F0-9]{40}$', value):
            return TargetType.HASH
        if re.match(r'^[a-fA-F0-9]{64}$', value):
            return TargetType.HASH
        
        # Check if domain
        if re.match(r'^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$', value):
            return TargetType.DOMAIN
        
        # Default to username
        return TargetType.USERNAME
    
    @staticmethod
    def validate_target(value: str, target_type: TargetType) -> bool:
        """Validate target value against expected type"""
        if target_type == TargetType.IP:
            try:
                ipaddress.ip_address(value)
                return True
            except ValueError:
                return False
        
        elif target_type == TargetType.EMAIL:
            return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value))
        
        elif target_type == TargetType.DOMAIN:
            return bool(re.match(r'^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$', value))
        
        elif target_type == TargetType.URL:
            return value.startswith(('http://', 'https://'))
        
        elif target_type == TargetType.PHONE:
            return bool(re.match(r'^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,15}$', value))
        
        elif target_type == TargetType.USERNAME:
            return bool(re.match(r'^[a-zA-Z0-9._-]{1,64}$', value))
        
        return True