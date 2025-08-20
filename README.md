# CitizenCare: The future of civic engagement, powered by AI.

### Project Overview
CitizenCare is a web platform designed to streamline citizen feedback and issue tracking for local governments and authorities. By leveraging AI, the platform transforms unstructured complaints and feedback into actionable insights, helping governments categorize, analyze sentiment, and prioritize issues effectively.

### The Problem
Governments and local bodies often receive a flood of unstructured complaints or feedback through various channels. Without a centralized system to categorize, analyze sentiment, or prioritize these issues, valuable citizen input can be lost or overlooked, leading to slow response times and citizen dissatisfaction.

### The Solution
CitizenCare provides a comprehensive solution through a user-friendly web application with two main interfaces:

* **Citizen Portal:** A simple and intuitive interface where citizens can submit feedback and report issues in both text and image formats.
* **Admin Dashboard:** A powerful dashboard for authorities to view and manage incoming feedback. The AI integration provides:
    * **AI-Generated Summaries:** Quick summaries of lengthy feedback.
    * **Sentiment Analysis:** An immediate understanding of the citizen's sentiment (positive, negative, neutral).
    * **Category Tags:** Automatically generated tags to categorize issues (e.g., `Pothole`, `Waste Management`, `Street Light`).
* **Actionable Insights:** Authorities can filter and respond to issues, assign tasks to relevant departments, and prioritize them based on urgency, all from a single dashboard.

### Tech Stack

#### **Frontend**
* **React:** A JavaScript library for building user interfaces.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **Shadcn/UI:** A collection of reusable components for building beautiful user interfaces.

#### **Backend**
* **Node.js:** A JavaScript runtime for building scalable server-side applications.
* **Express.js:** A minimal and flexible Node.js web application framework.

#### **Database**
* **MongoDB Atlas:** A cloud-based NoSQL database service, providing a flexible and scalable solution for storing application data.

#### **AI & Authentication**
* **Gemini API:** Used for advanced AI capabilities, including text analysis, summarization, and categorization.
* **Clerk JWT:** A robust authentication solution for secure user and admin login.

### Features
* **Multi-format Feedback Submission:** Users can submit feedback via text or by uploading an image.
* **AI-Powered Categorization:** Automatically assigns relevant tags to issues for easy filtering.
* **Sentiment Analysis:** Provides sentiment scores to help authorities gauge the urgency and tone of feedback.
* **Priority and Urgency Sorting:** Admins can quickly filter issues by urgency to address critical problems first.
* **Task Assignment:** Authorities can assign issues to specific departments or individuals for resolution.
* **Secure Authentication:** User and admin accounts are secured using Clerk JWT.

### Getting Started
To get a copy of this project up and running on your local machine, follow these steps.

#### **Prerequisites**
* Node.js (LTS recommended)
* npm or yarn
* A MongoDB Atlas account
* A Gemini API key
* A Clerk account

#### **Installation**

**1. Clone the repository:**
```bash
git clone [https://github.com/your-username/citizencare.git](https://github.com/PRATYAKSH15/CitizenCare.git)
cd citizencare