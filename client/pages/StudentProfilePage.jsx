import { useParams } from 'react-router-dom';

const StudentProfilePage = () => {
  const { studentId } = useParams();

  return (
    <div className="simple-page">
      <h1>Student Profile</h1>
      <p>Student ID: {studentId}</p>
    </div>
  );
};

export default StudentProfilePage;
