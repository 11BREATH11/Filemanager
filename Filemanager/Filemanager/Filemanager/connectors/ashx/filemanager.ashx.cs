using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using System.Configuration;
using System.Drawing;
using System.Drawing.Imaging;
using System.Net;
using System.Security.Cryptography.X509Certificates;

namespace NewFileManager.FileManager.connectors.ashx
{
    /// <summary>
    /// Summary description for filemanager
    /// </summary>
    public class filemanager : IHttpHandler
    {

        //===================================================================
        //==================== EDIT CONFIGURE HERE ==========================
        //===================================================================

        public string IconDirectory = "./images/fileicons/"; // Icon directory for filemanager. [string]
        public string[] imgExtensions = new string[] { ".jpg", ".png", ".jpeg", ".gif", ".bmp" }; // Only allow this image extensions. [string]        
        public static bool useFileTable;

        //===================================================================
        //========================== END EDIT ===============================
        //===================================================================       


        private bool IsImage(FileInfo fileInfo)
        {
            foreach (string ext in imgExtensions)
            {
                if (Path.GetExtension(fileInfo.FullName) == ext)
                {
                    return true;
                }
            }

            return false;
        }

        private bool IsImage(string extIn)
        {
            foreach (string ext in imgExtensions)
            {
                if (extIn == ext)
                {
                    return true;
                }
            }

            return false;
        }        

        public struct FileList
        {
            public string FileName;
            public string FileType;
            public string Path;
            public DateTime DateCreated;
            public DateTime DateModified;
            public string Size;
            public string PathLocator;
            public string ParentPathLocator;
            public bool is_directory;
            public string user_id;
            public string user_create;
            public string date_document;
            public int ComponentLevel;
        }
        
        private IEnumerable<FileList> ConvertToFileList(string path,System.Data.DataTable dataTable)
        {
            DateTime myDate;          
            return dataTable.AsEnumerable().Select(row =>
                {
                    return new FileList
                    {
                        FileName = row["FileName"].ToString(),
                        ComponentLevel = Convert.ToInt32(row["ComponentLevel"].ToString()),
                        FileType = row["FileType"].ToString(),
                        Path = path + "/" + row["Path"].ToString(),
                        DateCreated = Convert.ToDateTime(row["Date Created"].ToString()),
                        DateModified = Convert.ToDateTime(row["Date Modified"].ToString()),
                        Size = row["Size"].ToString(),
                        PathLocator = row["PathLocator"].ToString(),
                        ParentPathLocator = row["ParentPathLocator"].ToString(),
                        is_directory = Convert.ToBoolean(row["is_directory"].ToString()),
                        user_id = row["user_id"] !=null ? row["user_id"].ToString() : "",
                        user_create = row["user_create"] != null ? row["user_create"].ToString() : "",
                        date_document = DateTime.TryParse(row["date_document"].ToString(), out myDate) ? myDate.ToString("dd.MM.yyyy") : ""
                    };
                });
        }

        private string getFolderInfoList(string path)
        {           

            string str = "";

            if (useFileTable)
            {          
                str = getFolderInfoListFileTable(path);
            }
            else
            {
                str = getFolderInfoRecurs(path);
            }

            return str;
        }

        private string PathRoot;
        
        private void InitDependencyChange()
        {

            SqlConnection sqlConn = new SqlConnection(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);

            sqlConn.Open();            

            SqlCommand command = new SqlCommand("SELECT ImagePath,Inserteddate FROM dbo.ImageLog", sqlConn);

            SqlDependency dependency = new SqlDependency(command);        

            dependency.OnChange += new OnChangeEventHandler(OnDependencyChange);            

            command.ExecuteReader();

            sqlConn.Close();

        }

        private static void OnChanged(object source, FileSystemEventArgs e)
        {
            Console.WriteLine("File or directory " + e.FullPath + " was " + e.ChangeType);
        }

        void OnDependencyChange(object sender, SqlNotificationEventArgs e)
        {
            // Handle the event (for example, invalidate this cache entry).
            //RemoveCache();            
            
            InitDependencyChange();
      
        }

        public IEnumerable<FileList> list;
        private HttpContext httpContext;

        private string getFolderInfoListFileTable(string path)
        {
                path = path.Substring(0, path.Length - 1);                

                /*FileSystemWatcher fileSystemWatcher = new FileSystemWatcher();

                fileSystemWatcher.Path = path.Replace("/", "\\");
                fileSystemWatcher.IncludeSubdirectories = true;
                fileSystemWatcher.NotifyFilter =
                NotifyFilters.LastAccess | NotifyFilters.LastWrite
                | NotifyFilters.FileName | NotifyFilters.DirectoryName;

                fileSystemWatcher.Filter = "*.*";

                fileSystemWatcher.Changed += new FileSystemEventHandler(OnChanged);
                fileSystemWatcher.Created += new FileSystemEventHandler(OnChanged);
                fileSystemWatcher.Deleted += new FileSystemEventHandler(OnChanged);
                //fileSystemWatcher.Renamed += new RenamedEventHandler(OnRenamed);

                fileSystemWatcher.EnableRaisingEvents = true;      */          
            
                SqlConnection sqlConn = new SqlConnection(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);

                sqlConn.Open();

                //SqlDependency.Start(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);

                System.Data.DataTable dt = new System.Data.DataTable();
                SqlCommand sqlCmd = new SqlCommand("GetFileListFromPath", sqlConn);
                sqlCmd.CommandType = CommandType.StoredProcedure;

                SqlParameter pathParam = new SqlParameter("@paramPath", SqlDbType.VarChar);

                pathParam.Value = path.Replace("/", "\\");
                sqlCmd.Parameters.Add(pathParam);

                DataSet ds = new DataSet();

                SqlDataAdapter da = new SqlDataAdapter();
                da.SelectCommand = sqlCmd;                

                da.Fill(ds, "Attributes");

                dt = ds.Tables["Attributes"];          

                sqlConn.Close();

                PathRoot = path;
                httpContext = HttpContext.Current;

                //InitDependencyChange();

                list = ConvertToFileList(path,dt);

                string str = getFolderInfoRecursFileTable(list.Where(m => m.ComponentLevel == 0).OrderBy(m => m.is_directory == false));           
            

            return str;
        }

        private string getFolderInfoRecursFileTable(IEnumerable<FileList> listIn)
        {
            StringBuilder sb = new StringBuilder();

            //DirectoryInfo RootDirInfo = new DirectoryInfo(path);

            sb.AppendLine("{");

            int i = 0;

            foreach (FileList data in listIn)
            {
                if (i > 0)
                {
                    sb.Append(",");
                    sb.AppendLine();
                }

                if (data.is_directory)
                {
                    sb.AppendLine("\"" + data.Path+ "/\": {");

                    string str = "{}";

                    var newList = list.Where(m => m.ParentPathLocator == data.PathLocator).OrderBy(m => m.is_directory == false);                    

                    if (newList.Count() > 0)
                    {
                        str = getFolderInfoRecursFileTable(newList);
                    }

                    sb.AppendLine("\"PathChild\": " + str + ",");

                    sb.AppendLine("\"Path\": \"" + data.Path + "/\",");
                    sb.AppendLine("\"Filename\": \"" + data.FileName + "\",");
                    sb.AppendLine("\"File Type\": \"dir\",");
                    sb.AppendLine("\"Preview\": \"" + IconDirectory + "_Open.png\",");
                    sb.AppendLine("\"Properties\": {");
                    sb.AppendLine("\"Date Created\": \"" + data.DateCreated.ToString("dd.MM.yyyy") + "\", ");
                    sb.AppendLine("\"Date Modified\": \"" + data.DateModified.ToString("dd.MM.yyyy") + "\", ");
                    sb.AppendLine("\"Height\": 0,");
                    sb.AppendLine("\"Width\": 0,");
                    sb.AppendLine("\"Size\": 0 ");
                    sb.AppendLine("},");
                    sb.AppendLine("\"Error\": \"\",");
                    sb.AppendLine("\"Code\": 0	");
                    sb.Append("}");                    
                }else
                {
                    sb.AppendLine("\"" + data.Path + "\": {");
                    sb.AppendLine("\"PathChild\": {},");
                    sb.AppendLine("\"Path\": \"" + data.Path + "\",");
                    sb.AppendLine("\"Filename\": \"" + data.FileName + "\",");
                    sb.AppendLine("\"File Type\": \"" + data.FileType + "\",");

                    if (IsImage("." + data.FileType))
                    {
                        string url = "connectors/ashx/filemanager.ashx?path=" + data.Path+ "&mode=redirect";
                        sb.AppendLine("\"Preview\": \"" + url + "\",");
                    }
                    else
                    {
                        sb.AppendLine("\"Preview\": \"" + String.Format("{0}{1}.png", IconDirectory, data.FileType) + "\",");
                    }

                    sb.AppendLine("\"Properties\": {");
                    sb.AppendLine("\"Date Created\": \"" + data.DateCreated.ToString("dd.MM.yyyy") + "\", ");
                    sb.AppendLine("\"Date Modified\": \"" + data.DateModified.ToString("dd.MM.yyyy") + "\", ");

                    if (IsImage("." + data.FileType))
                    {
                        //using (System.Drawing.Image img = System.Drawing.Image.FromFile(fileInfo.FullName))

                        /*try
                        {
                            using (FileStream fs = new FileStream(data.Path, FileMode.Open, FileAccess.Read))
                            {
                                using (System.Drawing.Image img = System.Drawing.Image.FromStream(fs))
                                {

                                    sb.AppendLine("\"Height\": " + img.Height.ToString() + ",");
                                    sb.AppendLine("\"Width\": " + img.Width.ToString() + ",");
                                }
                            }
                        }
                        catch (Exception e)
                        {*/
                            sb.AppendLine("\"Height\": \"\",");
                            sb.AppendLine("\"Width\": \"\",");
                        //}
                    }
               
                    sb.AppendLine("\"User\": \"" + (data.user_id!=null ? data.user_id.ToString() : "") + "\",");
                    sb.AppendLine("\"UserCreate\": \"" + (data.user_create != null ? data.user_create : "") + "\",");
                    sb.AppendLine("\"DateDocument\": \"" + data.date_document + "\",");
                    sb.AppendLine("\"Size\": " + data.Size + " ");
                    sb.AppendLine("},");
                    sb.AppendLine("\"Error\": \"\",");
                    sb.AppendLine("\"Code\": 0");
                    sb.Append("}");
                }


                i++;
            }                      

            sb.AppendLine();
            sb.AppendLine("}");

            return sb.ToString();
        }

        private string getFolderInfoRecurs(string path)
        {
            
            StringBuilder sb = new StringBuilder();

            DirectoryInfo RootDirInfo = new DirectoryInfo(path);

            sb.AppendLine("{");

            int i = 0;            

            foreach (DirectoryInfo DirInfo in RootDirInfo.GetDirectories())
            {
                if (i > 0)
                {
                    sb.Append(",");
                    sb.AppendLine();
                }

                sb.AppendLine("\"" + Path.Combine(path, DirInfo.Name).Replace("\\","/") + "/\": {");


                string str = getFolderInfoRecurs(Path.Combine(path, DirInfo.Name).Replace("\\","/"));                                

                sb.AppendLine("\"PathChild\": " + str +",");

                sb.AppendLine("\"Path\": \"" + Path.Combine(path, DirInfo.Name).Replace("\\","/") + "/\",");
                sb.AppendLine("\"Filename\": \"" + DirInfo.Name + "\",");
                sb.AppendLine("\"File Type\": \"dir\",");
                sb.AppendLine("\"Preview\": \"" + IconDirectory + "_Open.png\",");
                sb.AppendLine("\"Properties\": {");
                sb.AppendLine("\"Date Created\": \"" + DirInfo.CreationTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Date Modified\": \"" + DirInfo.LastWriteTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Height\": 0,");
                sb.AppendLine("\"Width\": 0,");
                sb.AppendLine("\"Size\": 0 ");
                sb.AppendLine("},");
                sb.AppendLine("\"Error\": \"\",");
                sb.AppendLine("\"Code\": 0	");         
                sb.Append("}");               

                i++;
            }

            //SqlConnection sqlConn = new SqlConnection(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);
            
            foreach (FileInfo fileInfo in RootDirInfo.GetFiles())
            {                        
                    System.Data.DataTable dt = new System.Data.DataTable();
                    /*SqlCommand sqlCmd = new SqlCommand("GetAttributeFromPath", sqlConn);
                    sqlCmd.CommandType = CommandType.StoredProcedure;

                    SqlParameter pathParam = new SqlParameter("@path", SqlDbType.VarChar);
                    //string pathValue = path.Replace("/", "\\");

                    pathParam.Value = Path.Combine(path, fileInfo.Name).Replace("/", "\\");
                    sqlCmd.Parameters.Add(pathParam);

                    DataSet ds = new DataSet();

                    SqlDataAdapter da = new SqlDataAdapter();
                    da.SelectCommand = sqlCmd;

                    da.Fill(ds, "Attributes");

                    dt = ds.Tables["Attributes"];    */  


                if (i > 0)
                {
                    sb.Append(",");
                    sb.AppendLine();
                }           

                sb.AppendLine("\"" + Path.Combine(path, fileInfo.Name).Replace("\\","/") + "\": {");
                sb.AppendLine("\"PathChild\": {},");
                sb.AppendLine("\"Path\": \"" + Path.Combine(path, fileInfo.Name).Replace("\\","/") + "\",");
                sb.AppendLine("\"Filename\": \"" + fileInfo.Name + "\",");
                sb.AppendLine("\"File Type\": \"" + fileInfo.Extension.Replace(".", "") + "\",");

                if (IsImage(fileInfo))
                {                    
                    string url = "connectors/ashx/filemanager.ashx?path=" + Path.Combine(path, fileInfo.Name).Replace("\\", "/") + "&mode=redirect";                    
                    sb.AppendLine("\"Preview\": \"" +  url + "\",");
                }
                else
                {
                    sb.AppendLine("\"Preview\": \"" + String.Format("{0}{1}.png", IconDirectory, fileInfo.Extension.Replace(".", "")) + "\",");
                }

                sb.AppendLine("\"Properties\": {");
                sb.AppendLine("\"Date Created\": \"" + fileInfo.CreationTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Date Modified\": \"" + fileInfo.LastWriteTime.ToString("dd.MM.yyyy") + "\", ");

                if (IsImage(fileInfo))
                {
                    //using (System.Drawing.Image img = System.Drawing.Image.FromFile(fileInfo.FullName))

                    /*try
                    {
                        using (FileStream fs = new FileStream(fileInfo.FullName, FileMode.Open, FileAccess.Read))
                        {
                            using (System.Drawing.Image img = System.Drawing.Image.FromStream(fs))
                            {

                                sb.AppendLine("\"Height\": " + img.Height.ToString() + ",");
                                sb.AppendLine("\"Width\": " + img.Width.ToString() + ",");
                            }
                        }
                    }
                    catch (Exception e)
                    {*/
                        sb.AppendLine("\"Height\": \"\",");
                        sb.AppendLine("\"Width\": \"\",");
                    //}
                }

                string date_document = "";
                DateTime date_doc;
                if (dt.Rows.Count > 0 && DateTime.TryParse(dt.Rows[0]["date_document"].ToString(), out date_doc))
                {
                    date_document = date_doc.ToString("dd.MM.yyyy");
                }
                
                sb.AppendLine("\"User\": \"" + (dt.Rows.Count > 0 ? dt.Rows[0]["user_id"].ToString() : "") + "\",");
                sb.AppendLine("\"UserCreate\": \"" + (dt.Rows.Count > 0 ? dt.Rows[0]["user_create"].ToString() : "") + "\",");
                sb.AppendLine("\"DateDocument\": \"" + date_document + "\",");
                sb.AppendLine("\"Size\": " + fileInfo.Length.ToString() + " ");
                sb.AppendLine("},");
                sb.AppendLine("\"Error\": \"\",");
                sb.AppendLine("\"Code\": 0");
                sb.Append("}");

                i++;
            }

            sb.AppendLine();
            sb.AppendLine("}");

            return sb.ToString();
        }

        private string getInfo(string path)
        {
            string result = checkPath(path);

            if (result != "") { return result; }

            System.Data.DataTable dt = new System.Data.DataTable();

            if (useFileTable)
            {
                SqlConnection sqlConn = new SqlConnection(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);
                SqlCommand sqlCmd = new SqlCommand("GetAttributeFromPath", sqlConn);
                sqlCmd.CommandType = CommandType.StoredProcedure;

                SqlParameter pathParam = new SqlParameter("@path", SqlDbType.VarChar);
                string pathValue = path.Replace("/", "\\");
                pathParam.Value = pathValue;
                sqlCmd.Parameters.Add(pathParam);

                DataSet ds = new DataSet();

                SqlDataAdapter da = new SqlDataAdapter();
                da.SelectCommand = sqlCmd;

                da.Fill(ds, "Attributes");

                dt = ds.Tables["Attributes"];
            }

            StringBuilder sb = new StringBuilder();

            FileAttributes attr = System.IO.File.GetAttributes(path);

            if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
            {
                DirectoryInfo DirInfo = new DirectoryInfo(path);

                sb.AppendLine("{");
                sb.AppendLine("\"Path\": \"" + path + "\",");
                sb.AppendLine("\"Filename\": \"" + DirInfo.Name + "\",");
                sb.AppendLine("\"File Type\": \"dir\",");
                sb.AppendLine("\"Preview\": \"" + IconDirectory + "_Open.png\",");
                sb.AppendLine("\"Properties\": {");
                sb.AppendLine("\"Date Created\": \"" + DirInfo.CreationTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Date Modified\": \"" + DirInfo.LastWriteTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Height\": 0,");
                sb.AppendLine("\"Width\": 0,");
                sb.AppendLine("\"Size\": 0 ");
                sb.AppendLine("},");
                sb.AppendLine("\"Error\": \"\",");
                sb.AppendLine("\"Code\": 0	");
                sb.AppendLine("}");
            }
            else
            {
                FileInfo fileInfo = new FileInfo(path);

                sb.AppendLine("{");
                sb.AppendLine("\"Path\": \"" + path + "\",");
                sb.AppendLine("\"Filename\": \"" + fileInfo.Name + "\",");
                sb.AppendLine("\"File Type\": \"" + fileInfo.Extension.Replace(".", "") + "\",");

                if (IsImage(fileInfo))
                {
                    string url = "connectors/ashx/filemanager.ashx?path=" + Path.Combine(path, fileInfo.Name).Replace("\\", "/") + "&mode=redirect";
                    sb.AppendLine("\"Preview\": \"" + url + "\",");
                }
                else
                {
                    sb.AppendLine("\"Preview\": \"" + String.Format("{0}{1}.png", IconDirectory, fileInfo.Extension.Replace(".", "")) + "\",");
                }

                sb.AppendLine("\"Properties\": {");
                sb.AppendLine("\"Date Created\": \"" + fileInfo.CreationTime.ToString("dd.MM.yyyy") + "\", ");
                sb.AppendLine("\"Date Modified\": \"" + fileInfo.LastWriteTime.ToString("dd.MM.yyyy") + "\", ");

                if (IsImage(fileInfo))
                {
                    //using (System.Drawing.Image img = System.Drawing.Image.FromFile(path))
                    using (FileStream fs = new FileStream(fileInfo.FullName, FileMode.Open, FileAccess.Read))
                    {
                        using (System.Drawing.Image img = System.Drawing.Image.FromStream(fs))
                        {
                            {
                                sb.AppendLine("\"Height\": " + img.Height.ToString() + ",");
                                sb.AppendLine("\"Width\": " + img.Width.ToString() + ",");
                            }
                        }
                    }
                }

                sb.AppendLine("\"Size\": " + fileInfo.Length.ToString() + ",");
                sb.AppendLine("\"User\": \"" + (dt.Rows.Count > 0 ? dt.Rows[0]["user_id"].ToString() : "") + "\"");
                sb.AppendLine("},");
                sb.AppendLine("\"Error\": \"\",");
                sb.AppendLine("\"Code\": 0	");
                sb.AppendLine("}");
            }

            return sb.ToString();

        }

        private string editFileEditor(string path)
        {

            string result = checkPath(path);

            if (result != "") { return result; }

            //FileInfo fileInfo = new FileInfo(path);
            //StreamReader read = fileInfo.OpenText();

            //string text = read.ReadLine();

            //read.Close();

            StringBuilder sb = new StringBuilder();

            sb.AppendLine("{");
            sb.AppendLine("\"Content\": {");

            using (StreamReader sr = new StreamReader(path))
            {
                int i = 0;
                while (sr.Peek() >= 0)
                {
                    i++;

                    sb.Append("\"" + i + "\":" + "\"" + sr.ReadLine() + "\"");

                    if (sr.Peek() >= 0) { sb.Append(","); }
                }
            }


            sb.AppendLine("},");

            sb.AppendLine("\"Error\": \"\",");
            sb.AppendLine("\"Code\": 0	");
            sb.AppendLine("}");

            return sb.ToString();
        }

        private string saveFileEditor(string path, string content)
        {

            StringBuilder sb = new StringBuilder();

            FileInfo fileInfo = new FileInfo(path);

            StreamWriter save = fileInfo.CreateText();
            save.Write(content);
            save.Close();

            sb.AppendLine("{");
            sb.AppendLine("\"Path\": \"" + path + "\",");
            sb.AppendLine("\"Error\": \"\",");
            sb.AppendLine("\"Code\": 0	");
            sb.AppendLine("}");

            return sb.ToString();

        }    

        private string editFile(string path)
        { 
            string result = checkPath(path);
            if (result != "") { return result; }           
            
            return "";   
        }

        private string saveFile(string fileId,string path)
        {           

            return "";
        }
       
        public void SaveStreamToFile(string filename, Stream stream)
        {
            if (stream.Length != 0)
                using (FileStream fileStream = System.IO.File.Create(filename, (int)stream.Length))
                {
                    // Размещает массив общим размером равным размеру потока
                    // Могут быть трудности с выделением памяти для больших объемов
                    byte[] data = new byte[stream.Length];

                    stream.Read(data, 0, (int)data.Length);
                    fileStream.Write(data, 0, data.Length);
                }
        }

        private string Rename(string path, string newName)
        {
            StringBuilder sb = new StringBuilder();

            string resultCheck = checkPath(path);

             if (resultCheck != ""){return resultCheck;}

                FileAttributes attr = System.IO.File.GetAttributes(path);                

                if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
                {
                    DirectoryInfo dirInfo = new DirectoryInfo(path);
                    try
                    {
                        Directory.Move(path, Path.Combine(dirInfo.Parent.FullName, newName));
                    }
                    catch (Exception e)
                    {
                        sb.AppendLine("{");
                        sb.AppendLine("\"Error\": \"No error\",");
                        sb.AppendLine("\"Code\": -3");                        
                        sb.AppendLine("}");

                        return sb.ToString();
                    }

                    DirectoryInfo fileInfo2 = new DirectoryInfo(Path.Combine(dirInfo.Parent.FullName, newName));

                    sb.AppendLine("{");
                    sb.AppendLine("\"Error\": \"No error\",");
                    sb.AppendLine("\"Code\": 0,");
                    sb.AppendLine("\"Old Path\": \"" + path + "\",");
                    sb.AppendLine("\"Old Name\": \"" + newName + "\",");
                    sb.AppendLine("\"New Path\": \"" +
                        fileInfo2.FullName.Replace("\\", "/") + "/\",");
                    sb.AppendLine("\"New Name\": \"" + fileInfo2.Name + "\"");
                    sb.AppendLine("}");

                }
                else
                {
                    FileInfo fileInfo = new FileInfo(path);

                    try
                    {
                        System.IO.File.Move(path, Path.Combine(fileInfo.Directory.FullName, newName));
                    }
                    catch (Exception e)
                    {
                        sb.AppendLine("{");
                        sb.AppendLine("\"Error\": \"No error\",");
                        sb.AppendLine("\"Code\": -4");
                        sb.AppendLine("}");

                        return sb.ToString();
                    }                    

                    FileInfo fileInfo2 = new FileInfo(Path.Combine(fileInfo.Directory.FullName, newName));

                    sb.AppendLine("{");
                    sb.AppendLine("\"Error\": \"No error\",");
                    sb.AppendLine("\"Code\": 0,");
                    sb.AppendLine("\"Old Path\": \"" + path + "\",");
                    sb.AppendLine("\"Old Name\": \"" + newName + "\",");
                    sb.AppendLine("\"New Path\": \"" +
                        fileInfo2.FullName.Replace("\\", "/") + "\",");
                    sb.AppendLine("\"New Name\": \"" + fileInfo2.Name + "\"");
                    sb.AppendLine("}");
                }                   

            return sb.ToString();
        }

        private string Delete(string path)
        {
            StringBuilder sb = new StringBuilder();            

            if (System.IO.File.Exists(path))
            {               
               System.IO.File.Delete(path);                
            }

            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }            

            sb.AppendLine("{");
            sb.AppendLine("\"Error\": \"No error\",");
            sb.AppendLine("\"Code\": 0,");
            sb.AppendLine("\"Path\": \"" + path + "\"");
            sb.AppendLine("}");

            return sb.ToString();
        }

        private string AddFolder(string path, string NewFolder)
        {
            StringBuilder sb = new StringBuilder();

            if (Directory.Exists(Path.Combine(path, NewFolder)))
            {
                sb.AppendLine("{");
                sb.AppendLine("\"Error\": \"No error\",");
                sb.AppendLine("\"Code\": -3");
                sb.AppendLine("}");

                return sb.ToString();
            }
            
            Directory.CreateDirectory(Path.Combine(path, NewFolder));          

            sb.AppendLine("{");
            sb.AppendLine("\"Parent\": \"" + path + "\",");
            sb.AppendLine("\"Name\": \"" + NewFolder + "\",");
            sb.AppendLine("\"Error\": \"No error\",");
            sb.AppendLine("\"Code\": 0");
            sb.AppendLine("}");

            return sb.ToString();
        }

        private void AddParams(string user_id, string date_document,string user_create,string fullpath)
        {
            SqlConnection sqlConn = new SqlConnection(ConfigurationManager.ConnectionStrings["FileTableDBConnectionString"].ConnectionString);
            SqlCommand sqlCmd = new SqlCommand("fm_InsFileManagerInfo", sqlConn);
            sqlCmd.CommandType = CommandType.StoredProcedure;

            SqlParameter pathParam = new SqlParameter("@path", SqlDbType.VarChar);
            pathParam.Value = fullpath.Replace("/", "\\");
            sqlCmd.Parameters.Add(pathParam);

            if (user_id != "")
            {
                SqlParameter user_idParam = new SqlParameter("@user_id", SqlDbType.Int);
                user_idParam.Value = int.Parse(user_id);
                sqlCmd.Parameters.Add(user_idParam);
            }
            else
            {
                SqlParameter user_idParam = new SqlParameter("@user_id", DBNull.Value);
                sqlCmd.Parameters.Add(user_idParam);
            }

            if (date_document != "")
            {
                SqlParameter date_documentParam = new SqlParameter("@date_document", SqlDbType.DateTime);
                date_documentParam.Value = DateTime.Parse(date_document);
                sqlCmd.Parameters.Add(date_documentParam);
            }
            else
            {
                SqlParameter date_documentParam = new SqlParameter("@date_document", DBNull.Value);
                sqlCmd.Parameters.Add(date_documentParam);
            }


            if (user_create != "")
            {
                SqlParameter user_createParam = new SqlParameter("@user_create", SqlDbType.VarChar);
                user_createParam.Value = user_create;
                sqlCmd.Parameters.Add(user_createParam);
            }
            else
            {
                SqlParameter user_createParam = new SqlParameter("@user_create", DBNull.Value);
                sqlCmd.Parameters.Add(user_createParam);
            }

            SqlParameter idParam = new SqlParameter("@id", SqlDbType.Int);
            idParam.Direction = ParameterDirection.Output;
            sqlCmd.Parameters.Add(idParam);
            int id;


            try
            {
                sqlConn.Open();
                sqlCmd.ExecuteNonQuery();

                id = Convert.ToInt32(idParam.Value);
            }
            finally
            {
                if (sqlConn.State == ConnectionState.Open)
                {
                    sqlConn.Close();
                }
            }

        }

        private void RemoveCache()
        {
            /*string usr = "guest";
            if (httpContext.User.Identity.IsAuthenticated)
                usr = httpContext.User.Identity.Name;

            string key = usr + "_" + PathRoot;*/

            HttpContext.Current.Cache.Remove("my");   
        }  

        public void ProcessRequest(HttpContext context)
        {            

            context.Response.ClearHeaders();
            context.Response.ClearContent();
            context.Response.Clear();            

            switch (context.Request["mode"])
            {                
                case "redirect":

                        string f = context.Request.QueryString.Get("path");                        
                        if (!System.IO.File.Exists(f))
                        {
                            context.Response.ContentType = "text/html";
                            context.Response.Write("Файл не знайдено.Будь ласка оновіть файлове дерево.");                                                       
                        }
                        else
                        {

                            string view = context.Request.QueryString.Get("view");

                            string ext = Path.GetExtension(f);
                            context.Response.ContentEncoding = Encoding.UTF8;                           

                            if (view != null && IsImage(ext) && view == "false")
                            {

                                using (FileStream fs = new FileStream(f, FileMode.Open, FileAccess.Read))
                                {
                                    using (System.Drawing.Image img = System.Drawing.Image.FromStream(fs))
                                    {

                                        Image resizeImg = (Image)(new Bitmap(img, new Size(64, 64)));

                                        MemoryStream ms = new MemoryStream();
                                        resizeImg.Save(ms, System.Drawing.Imaging.ImageFormat.Jpeg);

                                        context.Response.AddHeader("Content-Disposition", String.Format("inline;filename={0}", Path.GetFileName(f)));
                                        context.Response.AddHeader("Content-Length", ms.Length.ToString());
                                        context.Response.ContentType = GetMimeType(ext);
                                        context.Response.BinaryWrite(ms.ToArray());
                                    }
                                }
                            }
                            else
                            {
                                    using (FileStream fs = System.IO.File.OpenRead(f))
                                    {

                                        int length = (int)fs.Length;
                                        byte[] buffer;

                                        using (BinaryReader br = new BinaryReader(fs))
                                        {
                                            buffer = br.ReadBytes(length);
                                        }

                                        //context.Response.Clear();
                                        //context.Response.Buffer = true;
                                        context.Response.AddHeader("Content-Disposition", String.Format("inline;filename={0}", Path.GetFileName(f)));
                                        context.Response.AddHeader("Content-Length", length.ToString());
                                        context.Response.ContentType = GetMimeType(ext);
                                        context.Response.BinaryWrite(buffer);
                                    }
                                }              
                        }

                        context.Response.End();                  
                        

                        //HttpContext.Current.ApplicationInstance.CompleteRequest();                    

                    break;
                
                case "getinfo":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    context.Response.Write(getInfo(context.Request["path"]));

                    break;

                case "editfile":

                    context.Response.ContentType = "application/json";                    
                    context.Response.ContentEncoding = Encoding.UTF8;                    

                    context.Response.Write(editFile(context.Request["path"]));

                    break;
             

               case "savefile":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    context.Response.Write(saveFile(context.Request["fileId"], context.Request["path"]));

                    break;

               case "editfileEditor":

                    context.Response.ContentType = "application/json";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    context.Response.Write(editFileEditor(context.Request["path"]));

                    break;


               case "savefileEditor":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    context.Response.Write(saveFileEditor(context.Request["path"], context.Request["content"]));

                    break;
                    
                case "getfolder":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    string str="";

                    useFileTable = context.Request["useFileTable"] == "true" ? true : false;
                    
                    str = getFolderInfoList(context.Request["path"]);
                    
                    context.Response.Write(str);

                    break;

                case "getfolderList":

                    useFileTable = context.Request["useFileTable"] == "true" ? true : false;

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;
                    string usr="guest";
                    if (context.User.Identity.IsAuthenticated)
                        usr = context.User.Identity.Name;
                     string pathUsr=context.Request["path"];
                     string update = context.Request["update"];
                     
                     string key = usr + "_" + pathUsr;

                     if (update == "true")
                     {
                         context.Cache.Remove(key);
                     }

                     string tree = (string)context.Cache[key];
                     if (tree == null)
                     {
                         tree = getFolderInfoList(pathUsr);
                         context.Cache.Insert(key, tree, null, DateTime.Now.AddMinutes(3), TimeSpan.Zero);
                     }

                     context.Response.Write(tree);

                    break;
                case "rename":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;                    

                    context.Response.Write(Rename(context.Request["old"], context.Request["new"]));

                    break;
                case "delete":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;                    

                    context.Response.Write(Delete(context.Request["path"]));

                    break;
                case "addfolder":

                    context.Response.ContentType = "plain/text";
                    context.Response.ContentEncoding = Encoding.UTF8;                    

                    context.Response.Write(AddFolder(context.Request["path"], context.Request["name"]));

                    break;
                case "downloadCheck":                    

                    string resultCheck = checkPath(context.Request["path"]);

                    if (resultCheck == "")
                    {

                         StringBuilder sbNew = new StringBuilder();

                         sbNew.AppendLine("{");
                         sbNew.AppendLine("\"Error\": \"No error\",");
                         sbNew.AppendLine("\"Code\": 0");
                         sbNew.AppendLine("}");

                         context.Response.Write(sbNew.ToString());                        
                    }
                    else
                    {     
                        
                        context.Response.Write(resultCheck);
                    }

                    break;
                case "download": 
                    
                        FileInfo fi = new FileInfo(context.Request["path"]);

                        context.Response.AddHeader("Content-Disposition", "attachment; filename=" + context.Server.UrlPathEncode(fi.Name));
                        context.Response.AddHeader("Content-Length", fi.Length.ToString());
                        context.Response.ContentType = "application/octet-stream";
                        context.Response.TransmitFile(fi.FullName);  

                    break;               

                case "addFlash":                    

                    var fileNew = context.Request.Files[0];                    

                    string path = context.Request["currentpath"];

                    string user_id = context.Request["user_id"];
                    string user_create = context.Request["user_create"];
                    string date_document = context.Request["date_document"];

                    string fullpath = Path.Combine(path, Path.GetFileName(fileNew.FileName));

                    StringBuilder sb = new StringBuilder();
                    context.Response.ContentType = "text/html";
                    context.Response.ContentEncoding = Encoding.UTF8;

                    string pathFolder = fullpath.Substring(0, fullpath.LastIndexOf('/') + 1);

                     sb = new StringBuilder();

                     if (!Directory.Exists(pathFolder))
                     {
                            sb.AppendLine("{");
                            sb.AppendLine("\"Error\": \"No error\",");
                            sb.AppendLine("\"Code\": -2");
                            sb.AppendLine("}");

                            context.Response.Write(sb.ToString());

                            break;
                     }          

                    if (!System.IO.File.Exists(fullpath))
                    {
                        fileNew.SaveAs(fullpath);

                        if (useFileTable)
                        {
                            AddParams(user_id, date_document, user_create, fullpath);
                        }
                        
                        sb.AppendLine("{");
                        sb.AppendLine("\"Path\": \"" + path + "\",");
                        sb.AppendLine("\"Name\": \"" + Path.GetFileName(fileNew.FileName) + "\",");
                        sb.AppendLine("\"Error\": \"No error\",");
                        sb.AppendLine("\"Code\": 0");
                        sb.AppendLine("}");

                        context.Response.Write(sb.ToString());
                    }

                    else
                    {
                        System.IO.File.Delete(fullpath);
                        fileNew.SaveAs(fullpath);

                        if (useFileTable)
                        {
                            AddParams(user_id, date_document, user_create, fullpath);
                        }                        

                        sb.AppendLine("{");                        
                        sb.AppendLine("\"Path\": \"" + path + "\",");
                        sb.AppendLine("\"Name\": \"" + Path.GetFileName(fileNew.FileName) + "\",");
                        sb.AppendLine("\"Error\": \"Error\",");
                        sb.AppendLine("\"Code\": -1");
                        sb.AppendLine("}");

                        context.Response.Write(sb.ToString());
                    }                  

                    break;

                case "rewriteNoFlash":

                    var data = context.Request.Params["fileNames"];

                    path = context.Request["currentpath"];

                    string[] strFiles = data.Split(new Char[] { ',' });
                    sb = new StringBuilder();

                    sb.AppendLine("{");

                    for (int i = 0; i < strFiles.Length; i++)
                    {
                        if (i > 0)
                        {
                            sb.Append(",");
                            sb.AppendLine();
                        }

                        fullpath = Path.Combine(path, strFiles[i]);
                        sb.AppendLine("\"" + fullpath + "/\": {");
                        sb.AppendLine("\"File\": \"" + strFiles[i] + "\",");

                        if (!System.IO.File.Exists(fullpath))
                        {
                            sb.AppendLine("\"Code\": 0");
                        }
                        else
                        {
                            sb.AppendLine("\"Code\": -1");
                        }

                        sb.AppendLine("}");
                    }

                    sb.AppendLine("}");

                    context.Response.Write(sb.ToString());

                    break;

                    case "checkPath":

                        path = context.Request.QueryString["currentpath"];

                        Uri myUri = new Uri("http://"+ context.Request["currentpath"]);
                        string OldPath = HttpUtility.ParseQueryString(myUri.Query).Get("path");

                        context.Response.Write(checkPath(OldPath));
                        
                        break;

                case "getRootPath":

                        path = context.Request.QueryString["path"];

                        context.Response.Write(HttpContext.Current.Server.MapPath(path).Replace("\\","/"));

                        break;
                    
                default:
                    break;
            }
        }

        private string checkPath(string path)
        {
            string OldPath = path;

            if (path.Length == path.LastIndexOf('/') + 1)
            {
                path = path.Substring(0, path.LastIndexOf('/')); 
            }

            path = path.Substring(0, path.LastIndexOf('/') + 1);                     

            StringBuilder sb = new StringBuilder();

            if (!Directory.Exists(path))
            {
                sb.AppendLine("{");
                sb.AppendLine("\"Error\": \"No error\",");
                sb.AppendLine("\"Code\": -2");
                sb.AppendLine("}");

                return sb.ToString();                
            }

            if (!Directory.Exists(OldPath) && OldPath.LastIndexOf('/') == OldPath.Length - 1)
            {
                sb.AppendLine("{");
                sb.AppendLine("\"Error\": \"No error\",");
                sb.AppendLine("\"Code\": -2");
                sb.AppendLine("}");

                return sb.ToString();
            }

            if (!System.IO.File.Exists(OldPath) && OldPath.LastIndexOf('/') != OldPath.Length - 1)
            {
                string str;
                
                if (useFileTable)
                {
                    str = getFolderInfoListFileTable(path);
                }
                else
                {
                    str = getFolderInfoList(path);
                }

                str.Insert(0, "{");

                str = str.Substring(0, str.Length - 3);

                str += ",\"Path\":\"" + OldPath + "\"";

                str += ",\"Code\": -1";
                str += "}";

                return str;
            }

            return "";
        }

        private static IDictionary<string, string> _mappings = new Dictionary<string, string>(StringComparer.InvariantCultureIgnoreCase) {

        #region Big freaking list of mime types
        // combination of values from Windows 7 Registry and 
        // from C:\Windows\System32\inetsrv\config\applicationHost.config
        // some added, including .7z and .dat
        {".323", "text/h323"},
        {".3g2", "video/3gpp2"},
        {".3gp", "video/3gpp"},
        {".ogv", "video/ogg"},        
        {".3gp2", "video/3gpp2"},
        {".3gpp", "video/3gpp"},
        {".7z", "application/x-7z-compressed"},
        {".aa", "audio/audible"},
        {".AAC", "audio/aac"},
        {".aaf", "application/octet-stream"},
        {".aax", "audio/vnd.audible.aax"},
        {".ac3", "audio/ac3"},
        {".aca", "application/octet-stream"},
        {".accda", "application/msaccess.addin"},
        {".accdb", "application/msaccess"},
        {".accdc", "application/msaccess.cab"},
        {".accde", "application/msaccess"},
        {".accdr", "application/msaccess.runtime"},
        {".accdt", "application/msaccess"},
        {".accdw", "application/msaccess.webapplication"},
        {".accft", "application/msaccess.ftemplate"},
        {".acx", "application/internet-property-stream"},
        {".AddIn", "text/xml"},
        {".ade", "application/msaccess"},
        {".adobebridge", "application/x-bridge-url"},
        {".adp", "application/msaccess"},
        {".ADT", "audio/vnd.dlna.adts"},
        {".ADTS", "audio/aac"},
        {".afm", "application/octet-stream"},
        {".ai", "application/postscript"},
        {".aif", "audio/x-aiff"},
        {".aifc", "audio/aiff"},
        {".aiff", "audio/aiff"},
        {".air", "application/vnd.adobe.air-application-installer-package+zip"},
        {".amc", "application/x-mpeg"},
        {".application", "application/x-ms-application"},
        {".art", "image/x-jg"},
        {".asa", "application/xml"},
        {".asax", "application/xml"},
        {".ascx", "application/xml"},
        {".asd", "application/octet-stream"},
        {".asf", "video/x-ms-asf"},
        {".ashx", "application/xml"},
        {".asi", "application/octet-stream"},
        {".asm", "text/plain"},
        {".asmx", "application/xml"},
        {".aspx", "application/xml"},
        {".asr", "video/x-ms-asf"},
        {".asx", "video/x-ms-asf"},
        {".atom", "application/atom+xml"},
        {".au", "audio/basic"},
        {".avi", "video/x-msvideo"},
        {".axs", "application/olescript"},
        {".bas", "text/plain"},
        {".bcpio", "application/x-bcpio"},
        {".bin", "application/octet-stream"},
        {".bmp", "image/bmp"},
        {".c", "text/plain"},
        {".cab", "application/octet-stream"},
        {".caf", "audio/x-caf"},
        {".calx", "application/vnd.ms-office.calx"},
        {".cat", "application/vnd.ms-pki.seccat"},
        {".cc", "text/plain"},
        {".cd", "text/plain"},
        {".cdda", "audio/aiff"},
        {".cdf", "application/x-cdf"},
        {".cer", "application/x-x509-ca-cert"},
        {".chm", "application/octet-stream"},
        {".class", "application/x-java-applet"},
        {".clp", "application/x-msclip"},
        {".cmx", "image/x-cmx"},
        {".cnf", "text/plain"},
        {".cod", "image/cis-cod"},
        {".config", "application/xml"},
        {".contact", "text/x-ms-contact"},
        {".coverage", "application/xml"},
        {".cpio", "application/x-cpio"},
        {".cpp", "text/plain"},
        {".crd", "application/x-mscardfile"},
        {".crl", "application/pkix-crl"},
        {".crt", "application/x-x509-ca-cert"},
        {".cs", "text/plain"},
        {".csdproj", "text/plain"},
        {".csh", "application/x-csh"},
        {".csproj", "text/plain"},
        {".css", "text/css"},
        {".csv", "text/csv"},
        {".cur", "application/octet-stream"},
        {".cxx", "text/plain"},
        {".dat", "application/octet-stream"},
        {".datasource", "application/xml"},
        {".dbproj", "text/plain"},
        {".dcr", "application/x-director"},
        {".def", "text/plain"},
        {".deploy", "application/octet-stream"},
        {".der", "application/x-x509-ca-cert"},
        {".dgml", "application/xml"},
        {".dib", "image/bmp"},
        {".dif", "video/x-dv"},
        {".dir", "application/x-director"},
        {".disco", "text/xml"},
        {".dll", "application/x-msdownload"},
        {".dll.config", "text/xml"},
        {".dlm", "text/dlm"},
        {".doc", "application/msword"},
        {".docm", "application/vnd.ms-word.document.macroEnabled.12"},
        {".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},                   
        {".dot", "application/msword"},
        {".dotm", "application/vnd.ms-word.template.macroEnabled.12"},
        {".dotx", "application/vnd.openxmlformats-officedocument.wordprocessingml.template"},
        {".dsp", "application/octet-stream"},
        {".dsw", "text/plain"},
        {".dtd", "text/xml"},
        {".dtsConfig", "text/xml"},
        {".dv", "video/x-dv"},
        {".dvi", "application/x-dvi"},
        {".dwf", "drawing/x-dwf"},
        {".dwp", "application/octet-stream"},
        {".dxr", "application/x-director"},
        {".eml", "message/rfc822"},
        {".emz", "application/octet-stream"},
        {".eot", "application/octet-stream"},
        {".eps", "application/postscript"},
        {".etl", "application/etl"},
        {".etx", "text/x-setext"},
        {".evy", "application/envoy"},
        {".exe", "application/octet-stream"},
        {".exe.config", "text/xml"},
        {".fdf", "application/vnd.fdf"},
        {".fif", "application/fractals"},
        {".filters", "Application/xml"},
        {".fla", "application/octet-stream"},
        {".flr", "x-world/x-vrml"},
        {".flv", "video/x-flv"},
        {".fsscript", "application/fsharp-script"},
        {".fsx", "application/fsharp-script"},
        {".generictest", "application/xml"},
        {".gif", "image/gif"},
        {".group", "text/x-ms-group"},
        {".gsm", "audio/x-gsm"},
        {".gtar", "application/x-gtar"},
        {".gz", "application/x-gzip"},
        {".h", "text/plain"},
        {".hdf", "application/x-hdf"},
        {".hdml", "text/x-hdml"},
        {".hhc", "application/x-oleobject"},
        {".hhk", "application/octet-stream"},
        {".hhp", "application/octet-stream"},
        {".hlp", "application/winhlp"},
        {".hpp", "text/plain"},
        {".hqx", "application/mac-binhex40"},
        {".hta", "application/hta"},
        {".htc", "text/x-component"},
        {".htm", "text/html"},
        {".html", "text/html"},
        {".htt", "text/webviewhtml"},
        {".hxa", "application/xml"},
        {".hxc", "application/xml"},
        {".hxd", "application/octet-stream"},
        {".hxe", "application/xml"},
        {".hxf", "application/xml"},
        {".hxh", "application/octet-stream"},
        {".hxi", "application/octet-stream"},
        {".hxk", "application/xml"},
        {".hxq", "application/octet-stream"},
        {".hxr", "application/octet-stream"},
        {".hxs", "application/octet-stream"},
        {".hxt", "text/html"},
        {".hxv", "application/xml"},
        {".hxw", "application/octet-stream"},
        {".hxx", "text/plain"},
        {".i", "text/plain"},
        {".ico", "image/x-icon"},
        {".ics", "application/octet-stream"},
        {".idl", "text/plain"},
        {".ief", "image/ief"},
        {".iii", "application/x-iphone"},
        {".inc", "text/plain"},
        {".inf", "application/octet-stream"},
        {".inl", "text/plain"},
        {".ins", "application/x-internet-signup"},
        {".ipa", "application/x-itunes-ipa"},
        {".ipg", "application/x-itunes-ipg"},
        {".ipproj", "text/plain"},
        {".ipsw", "application/x-itunes-ipsw"},
        {".iqy", "text/x-ms-iqy"},
        {".isp", "application/x-internet-signup"},
        {".ite", "application/x-itunes-ite"},
        {".itlp", "application/x-itunes-itlp"},
        {".itms", "application/x-itunes-itms"},
        {".itpc", "application/x-itunes-itpc"},
        {".IVF", "video/x-ivf"},
        {".jar", "application/java-archive"},
        {".java", "application/octet-stream"},
        {".jck", "application/liquidmotion"},
        {".jcz", "application/liquidmotion"},
        {".jfif", "image/pjpeg"},
        {".jnlp", "application/x-java-jnlp-file"},
        {".jpb", "application/octet-stream"},
        {".jpe", "image/jpeg"},
        {".jpeg", "image/jpeg"},
        {".jpg", "image/jpeg"},
        {".js", "application/x-javascript"},
        {".jsx", "text/jscript"},
        {".jsxbin", "text/plain"},
        {".latex", "application/x-latex"},
        {".library-ms", "application/windows-library+xml"},
        {".lit", "application/x-ms-reader"},
        {".loadtest", "application/xml"},
        {".lpk", "application/octet-stream"},
        {".lsf", "video/x-la-asf"},
        {".lst", "text/plain"},
        {".lsx", "video/x-la-asf"},
        {".lzh", "application/octet-stream"},
        {".m13", "application/x-msmediaview"},
        {".m14", "application/x-msmediaview"},
        {".m1v", "video/mpeg"},
        {".m2t", "video/vnd.dlna.mpeg-tts"},
        {".m2ts", "video/vnd.dlna.mpeg-tts"},
        {".m2v", "video/mpeg"},
        {".m3u", "audio/x-mpegurl"},
        {".m3u8", "audio/x-mpegurl"},
        {".m4a", "audio/m4a"},
        {".m4b", "audio/m4b"},
        {".m4p", "audio/m4p"},
        {".m4r", "audio/x-m4r"},
        {".m4v", "video/x-m4v"},
        {".mac", "image/x-macpaint"},
        {".mak", "text/plain"},
        {".man", "application/x-troff-man"},
        {".manifest", "application/x-ms-manifest"},
        {".map", "text/plain"},
        {".master", "application/xml"},
        {".mda", "application/msaccess"},
        {".mdb", "application/x-msaccess"},
        {".mde", "application/msaccess"},
        {".mdp", "application/octet-stream"},
        {".me", "application/x-troff-me"},
        {".mfp", "application/x-shockwave-flash"},
        {".mht", "message/rfc822"},
        {".mhtml", "message/rfc822"},
        {".mid", "audio/mid"},
        {".midi", "audio/mid"},
        {".mix", "application/octet-stream"},
        {".mk", "text/plain"},
        {".mmf", "application/x-smaf"},
        {".mno", "text/xml"},
        {".mny", "application/x-msmoney"},
        {".mod", "video/mpeg"},
        {".mov", "video/quicktime"},
        {".movie", "video/x-sgi-movie"},
        {".mp2", "video/mpeg"},
        {".mp2v", "video/mpeg"},
        {".mp3", "audio/mpeg"},
        {".mp4", "video/mp4"},
        {".mp4v", "video/mp4"},
        {".mpa", "video/mpeg"},
        {".mpe", "video/mpeg"},
        {".mpeg", "video/mpeg"},
        {".mpf", "application/vnd.ms-mediapackage"},
        {".mpg", "video/mpeg"},
        {".mpp", "application/vnd.ms-project"},
        {".mpv2", "video/mpeg"},
        {".mqv", "video/quicktime"},
        {".ms", "application/x-troff-ms"},
        {".msi", "application/octet-stream"},
        {".mso", "application/octet-stream"},
        {".mts", "video/vnd.dlna.mpeg-tts"},
        {".mtx", "application/xml"},
        {".mvb", "application/x-msmediaview"},
        {".mvc", "application/x-miva-compiled"},
        {".mxp", "application/x-mmxp"},
        {".nc", "application/x-netcdf"},
        {".nsc", "video/x-ms-asf"},
        {".nws", "message/rfc822"},
        {".ocx", "application/octet-stream"},
        {".oda", "application/oda"},
        {".odc", "text/x-ms-odc"},
        {".odh", "text/plain"},
        {".odl", "text/plain"},
        {".odp", "application/vnd.oasis.opendocument.presentation"},
        {".ods", "application/oleobject"},
        {".odt", "application/vnd.oasis.opendocument.text"},
        {".one", "application/onenote"},
        {".onea", "application/onenote"},
        {".onepkg", "application/onenote"},
        {".onetmp", "application/onenote"},
        {".onetoc", "application/onenote"},
        {".onetoc2", "application/onenote"},
        {".orderedtest", "application/xml"},
        {".osdx", "application/opensearchdescription+xml"},
        {".p10", "application/pkcs10"},
        {".p12", "application/x-pkcs12"},
        {".p7b", "application/x-pkcs7-certificates"},
        {".p7c", "application/pkcs7-mime"},
        {".p7m", "application/pkcs7-mime"},
        {".p7r", "application/x-pkcs7-certreqresp"},
        {".p7s", "application/pkcs7-signature"},
        {".pbm", "image/x-portable-bitmap"},
        {".pcast", "application/x-podcast"},
        {".pct", "image/pict"},
        {".pcx", "application/octet-stream"},
        {".pcz", "application/octet-stream"},
        {".pdf", "application/pdf"},
        {".pfb", "application/octet-stream"},
        {".pfm", "application/octet-stream"},
        {".pfx", "application/x-pkcs12"},
        {".pgm", "image/x-portable-graymap"},
        {".pic", "image/pict"},
        {".pict", "image/pict"},
        {".pkgdef", "text/plain"},
        {".pkgundef", "text/plain"},
        {".pko", "application/vnd.ms-pki.pko"},
        {".pls", "audio/scpls"},
        {".pma", "application/x-perfmon"},
        {".pmc", "application/x-perfmon"},
        {".pml", "application/x-perfmon"},
        {".pmr", "application/x-perfmon"},
        {".pmw", "application/x-perfmon"},
        {".png", "image/png"},
        {".pnm", "image/x-portable-anymap"},
        {".pnt", "image/x-macpaint"},
        {".pntg", "image/x-macpaint"},
        {".pnz", "image/png"},
        {".pot", "application/vnd.ms-powerpoint"},
        {".potm", "application/vnd.ms-powerpoint.template.macroEnabled.12"},
        {".potx", "application/vnd.openxmlformats-officedocument.presentationml.template"},
        {".ppa", "application/vnd.ms-powerpoint"},
        {".ppam", "application/vnd.ms-powerpoint.addin.macroEnabled.12"},
        {".ppm", "image/x-portable-pixmap"},
        {".pps", "application/vnd.ms-powerpoint"},
        {".ppsm", "application/vnd.ms-powerpoint.slideshow.macroEnabled.12"},
        {".ppsx", "application/vnd.openxmlformats-officedocument.presentationml.slideshow"},
        {".ppt", "application/vnd.ms-powerpoint"},
        {".pptm", "application/vnd.ms-powerpoint.presentation.macroEnabled.12"},
        {".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
        {".prf", "application/pics-rules"},
        {".prm", "application/octet-stream"},
        {".prx", "application/octet-stream"},
        {".ps", "application/postscript"},
        {".psc1", "application/PowerShell"},
        {".psd", "application/octet-stream"},
        {".psess", "application/xml"},
        {".psm", "application/octet-stream"},
        {".psp", "application/octet-stream"},
        {".pub", "application/x-mspublisher"},
        {".pwz", "application/vnd.ms-powerpoint"},
        {".qht", "text/x-html-insertion"},
        {".qhtm", "text/x-html-insertion"},
        {".qt", "video/quicktime"},
        {".qti", "image/x-quicktime"},
        {".qtif", "image/x-quicktime"},
        {".qtl", "application/x-quicktimeplayer"},
        {".qxd", "application/octet-stream"},
        {".ra", "audio/x-pn-realaudio"},
        {".ram", "audio/x-pn-realaudio"},
        {".rar", "application/octet-stream"},
        {".ras", "image/x-cmu-raster"},
        {".rat", "application/rat-file"},
        {".rc", "text/plain"},
        {".rc2", "text/plain"},
        {".rct", "text/plain"},
        {".rdlc", "application/xml"},
        {".resx", "application/xml"},
        {".rf", "image/vnd.rn-realflash"},
        {".rgb", "image/x-rgb"},
        {".rgs", "text/plain"},
        {".rm", "application/vnd.rn-realmedia"},
        {".rmi", "audio/mid"},
        {".rmp", "application/vnd.rn-rn_music_package"},
        {".roff", "application/x-troff"},
        {".rpm", "audio/x-pn-realaudio-plugin"},
        {".rqy", "text/x-ms-rqy"},
        {".rtf", "application/rtf"},
        {".rtx", "text/richtext"},
        {".ruleset", "application/xml"},
        {".s", "text/plain"},
        {".safariextz", "application/x-safari-safariextz"},
        {".scd", "application/x-msschedule"},
        {".sct", "text/scriptlet"},
        {".sd2", "audio/x-sd2"},
        {".sdp", "application/sdp"},
        {".sea", "application/octet-stream"},
        {".searchConnector-ms", "application/windows-search-connector+xml"},
        {".setpay", "application/set-payment-initiation"},
        {".setreg", "application/set-registration-initiation"},
        {".settings", "application/xml"},
        {".sgimb", "application/x-sgimb"},
        {".sgml", "text/sgml"},
        {".sh", "application/x-sh"},
        {".shar", "application/x-shar"},
        {".shtml", "text/html"},
        {".sit", "application/x-stuffit"},
        {".sitemap", "application/xml"},
        {".skin", "application/xml"},
        {".sldm", "application/vnd.ms-powerpoint.slide.macroEnabled.12"},
        {".sldx", "application/vnd.openxmlformats-officedocument.presentationml.slide"},
        {".slk", "application/vnd.ms-excel"},
        {".sln", "text/plain"},
        {".slupkg-ms", "application/x-ms-license"},
        {".smd", "audio/x-smd"},
        {".smi", "application/octet-stream"},
        {".smx", "audio/x-smd"},
        {".smz", "audio/x-smd"},
        {".snd", "audio/basic"},
        {".snippet", "application/xml"},
        {".snp", "application/octet-stream"},
        {".sol", "text/plain"},
        {".sor", "text/plain"},
        {".spc", "application/x-pkcs7-certificates"},
        {".spl", "application/futuresplash"},
        {".src", "application/x-wais-source"},
        {".srf", "text/plain"},
        {".SSISDeploymentManifest", "text/xml"},
        {".ssm", "application/streamingmedia"},
        {".sst", "application/vnd.ms-pki.certstore"},
        {".stl", "application/vnd.ms-pki.stl"},
        {".sv4cpio", "application/x-sv4cpio"},
        {".sv4crc", "application/x-sv4crc"},
        {".svc", "application/xml"},
        {".swf", "application/x-shockwave-flash"},
        {".t", "application/x-troff"},
        {".tar", "application/x-tar"},
        {".tcl", "application/x-tcl"},
        {".testrunconfig", "application/xml"},
        {".testsettings", "application/xml"},
        {".tex", "application/x-tex"},
        {".texi", "application/x-texinfo"},
        {".texinfo", "application/x-texinfo"},
        {".tgz", "application/x-compressed"},
        {".thmx", "application/vnd.ms-officetheme"},
        {".thn", "application/octet-stream"},
        {".tif", "image/tiff"},
        {".tiff", "image/tiff"},
        {".tlh", "text/plain"},
        {".tli", "text/plain"},
        {".toc", "application/octet-stream"},
        {".tr", "application/x-troff"},
        {".trm", "application/x-msterminal"},
        {".trx", "application/xml"},
        {".ts", "video/vnd.dlna.mpeg-tts"},
        {".tsv", "text/tab-separated-values"},
        {".ttf", "application/octet-stream"},
        {".tts", "video/vnd.dlna.mpeg-tts"},
        {".txt", "text/plain"},
        {".u32", "application/octet-stream"},
        {".uls", "text/iuls"},
        {".user", "text/plain"},
        {".ustar", "application/x-ustar"},
        {".vb", "text/plain"},
        {".vbdproj", "text/plain"},
        {".vbk", "video/mpeg"},
        {".vbproj", "text/plain"},
        {".vbs", "text/vbscript"},
        {".vcf", "text/x-vcard"},
        {".vcproj", "Application/xml"},
        {".vcs", "text/plain"},
        {".vcxproj", "Application/xml"},
        {".vddproj", "text/plain"},
        {".vdp", "text/plain"},
        {".vdproj", "text/plain"},
        {".vdx", "application/vnd.ms-visio.viewer"},
        {".vml", "text/xml"},
        {".vscontent", "application/xml"},
        {".vsct", "text/xml"},
        {".vsd", "application/vnd.visio"},
        {".vsi", "application/ms-vsi"},
        {".vsix", "application/vsix"},
        {".vsixlangpack", "text/xml"},
        {".vsixmanifest", "text/xml"},
        {".vsmdi", "application/xml"},
        {".vspscc", "text/plain"},
        {".vss", "application/vnd.visio"},
        {".vsscc", "text/plain"},
        {".vssettings", "text/xml"},
        {".vssscc", "text/plain"},
        {".vst", "application/vnd.visio"},
        {".vstemplate", "text/xml"},
        {".vsto", "application/x-ms-vsto"},
        {".vsw", "application/vnd.visio"},
        {".vsx", "application/vnd.visio"},
        {".vtx", "application/vnd.visio"},
        {".wav", "audio/wav"},
        {".wave", "audio/wav"},
        {".wax", "audio/x-ms-wax"},
        {".wbk", "application/msword"},
        {".wbmp", "image/vnd.wap.wbmp"},
        {".wcm", "application/vnd.ms-works"},
        {".wdb", "application/vnd.ms-works"},
        {".wdp", "image/vnd.ms-photo"},
        {".webarchive", "application/x-safari-webarchive"},
        {".webtest", "application/xml"},
        {".wiq", "application/xml"},
        {".wiz", "application/msword"},
        {".wks", "application/vnd.ms-works"},
        {".WLMP", "application/wlmoviemaker"},
        {".wlpginstall", "application/x-wlpg-detect"},
        {".wlpginstall3", "application/x-wlpg3-detect"},
        {".wm", "video/x-ms-wm"},
        {".wma", "audio/x-ms-wma"},
        {".wmd", "application/x-ms-wmd"},
        {".wmf", "application/x-msmetafile"},
        {".wml", "text/vnd.wap.wml"},
        {".wmlc", "application/vnd.wap.wmlc"},
        {".wmls", "text/vnd.wap.wmlscript"},
        {".wmlsc", "application/vnd.wap.wmlscriptc"},
        {".wmp", "video/x-ms-wmp"},
        {".wmv", "video/x-ms-wmv"},
        {".wmx", "video/x-ms-wmx"},
        {".wmz", "application/x-ms-wmz"},
        {".wpl", "application/vnd.ms-wpl"},
        {".wps", "application/vnd.ms-works"},
        {".wri", "application/x-mswrite"},
        {".wrl", "x-world/x-vrml"},
        {".wrz", "x-world/x-vrml"},
        {".wsc", "text/scriptlet"},
        {".wsdl", "text/xml"},
        {".wvx", "video/x-ms-wvx"},
        {".x", "application/directx"},
        {".xaf", "x-world/x-vrml"},
        {".xaml", "application/xaml+xml"},
        {".xap", "application/x-silverlight-app"},
        {".xbap", "application/x-ms-xbap"},
        {".xbm", "image/x-xbitmap"},
        {".xdr", "text/plain"},
        {".xht", "application/xhtml+xml"},
        {".xhtml", "application/xhtml+xml"},
        {".xla", "application/vnd.ms-excel"},
        {".xlam", "application/vnd.ms-excel.addin.macroEnabled.12"},
        {".xlc", "application/vnd.ms-excel"},
        {".xld", "application/vnd.ms-excel"},
        {".xlk", "application/vnd.ms-excel"},
        {".xll", "application/vnd.ms-excel"},
        {".xlm", "application/vnd.ms-excel"},
        {".xls", "application/vnd.ms-excel"},
        {".xlsb", "application/vnd.ms-excel.sheet.binary.macroEnabled.12"},
        {".xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12"},
        {".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        {".xlt", "application/vnd.ms-excel"},
        {".xltm", "application/vnd.ms-excel.template.macroEnabled.12"},
        {".xltx", "application/vnd.openxmlformats-officedocument.spreadsheetml.template"},
        {".xlw", "application/vnd.ms-excel"},
        {".xml", "text/xml"},
        {".xmta", "application/xml"},
        {".xof", "x-world/x-vrml"},
        {".XOML", "text/plain"},
        {".xpm", "image/x-xpixmap"},
        {".xps", "application/vnd.ms-xpsdocument"},
        {".xrm-ms", "text/xml"},
        {".xsc", "application/xml"},
        {".xsd", "text/xml"},
        {".xsf", "text/xml"},
        {".xsl", "text/xml"},
        {".xslt", "text/xml"},
        {".xsn", "application/octet-stream"},
        {".xss", "application/xml"},
        {".xtp", "application/octet-stream"},
        {".xwd", "image/x-xwindowdump"},
        {".z", "application/x-compress"},
        {".zip", "application/x-zip-compressed"},
        #endregion

        };

        public static string GetMimeType(string extension)
        {
            if (extension == null)
            {
                throw new ArgumentNullException("extension");
            }

            if (!extension.StartsWith("."))
            {
                extension = "." + extension;
            }

            string mime;

            return _mappings.TryGetValue(extension, out mime) ? mime : "application/octet-stream";
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }


    }
}