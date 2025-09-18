-- Create DB and tables for SQL Server
-- Run in SSMS
CREATE DATABASE AuthDB;
GO
USE AuthDB;
GO

-- Bảng Users - lưu thông tin cá nhân người dùng
IF OBJECT_ID('Users','U') IS NULL
BEGIN
CREATE TABLE Users (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Username NVARCHAR(200) NOT NULL UNIQUE,
  FullName NVARCHAR(200) NOT NULL,
  DateOfBirth DATE NOT NULL,
  Address NVARCHAR(500),
  School NVARCHAR(200),
  Class NVARCHAR(100),
  Email NVARCHAR(255) NOT NULL,
  PhoneNumber NVARCHAR(20) NOT NULL,
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE()
);

-- Index cho Email và PhoneNumber trong Users
CREATE UNIQUE INDEX IX_Users_Email ON Users(Email);
CREATE UNIQUE INDEX IX_Users_PhoneNumber ON Users(PhoneNumber);
END
GO

-- Bảng Accounts - lưu thông tin đăng nhập
IF OBJECT_ID('Accounts','U') IS NULL
BEGIN
CREATE TABLE Accounts (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  UserId INT NOT NULL,
  Email NVARCHAR(255) NOT NULL,
  PhoneNumber NVARCHAR(20) NOT NULL,
  PasswordHash NVARCHAR(500) NOT NULL,
  FailedAttempts INT DEFAULT 0,
  IsEmailVerified BIT DEFAULT 0,
  IsPhoneVerified BIT DEFAULT 0,
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Account_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Index cho Email và PhoneNumber trong Accounts
CREATE UNIQUE INDEX IX_Accounts_Email ON Accounts(Email);
CREATE UNIQUE INDEX IX_Accounts_PhoneNumber ON Accounts(PhoneNumber);
END
GO

-- Bảng RefreshTokens - liên kết với Accounts
IF OBJECT_ID('RefreshTokens','U') IS NULL
BEGIN
CREATE TABLE RefreshTokens (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  AccountId INT NOT NULL,
  Token NVARCHAR(500) NOT NULL UNIQUE,
  ExpiresAt DATETIME NOT NULL,
  CreatedAt DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_RT_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id) ON DELETE CASCADE
);
END
GO

-- Bảng OtpCodes - liên kết với Accounts
IF OBJECT_ID('OtpCodes','U') IS NULL
BEGIN
CREATE TABLE OtpCodes (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  AccountId INT NOT NULL,
  Code NVARCHAR(6) NOT NULL,
  ExpiresAt DATETIME NOT NULL,
  IsUsed BIT DEFAULT 0,
  CreatedAt DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Otp_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id) ON DELETE CASCADE
);
END
GO

-- Trigger để cập nhật UpdatedAt khi có thay đổi cho Users
CREATE OR ALTER TRIGGER TR_Users_Update
ON Users
AFTER UPDATE
AS
BEGIN
  UPDATE Users 
  SET UpdatedAt = GETDATE()
  FROM Users u
  INNER JOIN inserted i ON u.Id = i.Id
END
GO

-- Trigger để cập nhật UpdatedAt khi có thay đổi cho Accounts
CREATE OR ALTER TRIGGER TR_Accounts_Update
ON Accounts
AFTER UPDATE
AS
BEGIN
  UPDATE Accounts 
  SET UpdatedAt = GETDATE()
  FROM Accounts a
  INNER JOIN inserted i ON a.Id = i.Id
END
GO

-- Stored Procedure để tạo User mới với Account
CREATE OR ALTER PROCEDURE sp_CreateUserWithAccount
    @Username NVARCHAR(200),
    @FullName NVARCHAR(200),
    @DateOfBirth DATE,
    @Address NVARCHAR(500),
    @School NVARCHAR(200),
    @Class NVARCHAR(100),
    @Email NVARCHAR(255),
    @PhoneNumber NVARCHAR(20),
    @PasswordHash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Tạo User
        DECLARE @UserId INT;
        INSERT INTO Users (Username, FullName, DateOfBirth, Address, School, Class, Email, PhoneNumber)
        VALUES (@Username, @FullName, @DateOfBirth, @Address, @School, @Class, @Email, @PhoneNumber);
        
        SET @UserId = SCOPE_IDENTITY();
        
        -- Tạo Account
        INSERT INTO Accounts (UserId, Email, PhoneNumber, PasswordHash)
        VALUES (@UserId, @Email, @PhoneNumber, @PasswordHash);
        
        COMMIT TRANSACTION;
        
        SELECT @UserId AS UserId, SCOPE_IDENTITY() AS AccountId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- Stored Procedure để lấy thông tin User đầy đủ
CREATE OR ALTER PROCEDURE sp_GetUserFullInfo
    @UserId INT
AS
BEGIN
    SELECT 
        u.Id AS UserId,
        u.Username,
        u.FullName,
        u.DateOfBirth,
        u.Address,
        u.School,
        u.Class,
        u.Email,
        u.PhoneNumber,
        a.Id AS AccountId,
        a.PasswordHash,
        a.FailedAttempts,
        a.IsEmailVerified,
        a.IsPhoneVerified
    FROM Users u
    INNER JOIN Accounts a ON u.Id = a.UserId
    WHERE u.Id = @UserId;
END
GO
-- Thêm cột AvatarFileName vào bảng Users để lưu tên file ảnh đại diện
ALTER TABLE Users ADD AvatarFileName NVARCHAR(255) NULL;

-- Xóa các mã OTP đã hết hạn (nên chạy định kỳ bằng job SQL Server)
DELETE FROM OtpCodes WHERE ExpiresAt < GETDATE() OR IsUsed = 1;