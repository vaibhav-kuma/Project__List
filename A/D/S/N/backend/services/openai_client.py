import json
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def score_job_match(user_profile: dict, job_data: dict) -> dict:
    """Score how well a job matches the user's profile using GPT-4."""
    prompt = f"""
    Analyze how well this job matches the user's profile.
    
    User Profile:
    - Title: {user_profile.get('title', 'N/A')}
    - Location: {user_profile.get('location', 'N/A')}
    - Min Salary: ${user_profile.get('salary_min', 0):,}
    - Work Type: {user_profile.get('work_type', 'Any')}
    - Experience: {user_profile.get('experience', 'N/A')}
    
    Job Details:
    - Title: {job_data.get('title', 'N/A')}
    - Company: {job_data.get('company', 'N/A')}
    - Location: {job_data.get('location', 'N/A')}
    - Salary: {job_data.get('salary', 'Not specified')}
    - Description: {job_data.get('description', '')[:500]}...
    
    Return JSON with:
    - score (0-100): Overall match percentage
    - reasoning (str): Brief explanation
    - fit_factors (list): Key matching factors
    - concerns (list): Any potential issues
    """
    
    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,
        )
        
        result_text = response.choices[0].message.content
        return json.loads(result_text)
    except Exception as e:
        print(f"Error scoring job: {e}")
        return {"score": 50, "reasoning": "Error during scoring", "fit_factors": [], "concerns": []}


async def extract_form_answers(job_description: str, user_answers: dict) -> dict:
    """Extract form-fillable answers from screening questions."""
    prompt = f"""
    Given these screening questions and user's pre-filled answers, extract the most appropriate answer for each question.
    
    Job Description: {job_description[:1000]}...
    
    User Answers Bank:
    {json.dumps(user_answers, indent=2)}
    
    Return JSON matching question to best answer from the bank.
    """
    
    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=500,
        )
        
        result_text = response.choices[0].message.content
        return json.loads(result_text)
    except Exception as e:
        print(f"Error extracting answers: {e}")
        return {}


async def generate_job_summary(job_description: str) -> str:
    """Generate a brief summary of the job posting."""
    prompt = f"""
    Provide a 2-3 sentence summary of this job posting:
    
    {job_description[:1500]}
    
    Be concise and highlight key responsibilities and requirements.
    """
    
    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150,
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Unable to generate summary"
