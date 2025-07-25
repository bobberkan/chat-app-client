import axios from 'axios'
import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import './App.css'

const socket = io('https://chat-app-server-cp5l.onrender.com', {
	autoConnect: false,
})

function App() {
	const [messages, setMessages] = useState([])
	const [newMessage, setNewMessage] = useState('')
	const [sender, setSender] = useState(
		sessionStorage.getItem('currentUser') || ''
	)
	const [receiver, setReceiver] = useState(
		sessionStorage.getItem('currentReceiver') || ''
	)
	const [users, setUsers] = useState([])
	const [loginName, setLoginName] = useState('')
	const [loginPassword, setLoginPassword] = useState('')
	const [signupName, setSignupName] = useState('')
	const [signupPassword, setSignupPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoggedIn, setIsLoggedIn] = useState(
		!!sessionStorage.getItem('currentUser')
	)
	const [searchQuery, setSearchQuery] = useState('')

	useEffect(() => {
		axios
			.get('https://chat-app-server-cp5l.onrender.com/users')
			.then(response => setUsers(response.data))
			.catch(error => console.error('Error fetching users:', error))
	}, [])

	useEffect(() => {
		if (isLoggedIn) socket.connect()
		return () => socket.disconnect()
	}, [isLoggedIn])

	useEffect(() => {
		if (isLoggedIn) {
			const handleNewMessage = message => {
				if (
					(message.sender === sender && message.receiver === receiver) ||
					(message.sender === receiver && message.receiver === sender)
				) {
					setMessages(prevMessages => [...prevMessages, message])
				}
			}
			socket.on('newMessage', handleNewMessage)
			return () => socket.off('newMessage', handleNewMessage)
		}
	}, [isLoggedIn, sender, receiver])

	useEffect(() => {
		if (sender && receiver && isLoggedIn) {
			axios
				.get(
					`https://chat-app-server-cp5l.onrender.com/messages?sender=${sender}&receiver=${receiver}`
				)
				.then(response => setMessages(response.data))
				.catch(error => console.error('Error fetching messages:', error))
		}
	}, [sender, receiver, isLoggedIn])

	useEffect(() => {
		const interval = setInterval(() => {
			axios.get('https://chat-app-server-cp5l.onrender.com/ping')
		}, 100000)
		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		const messagesEnd = document.getElementById('messagesEnd')
		if (messagesEnd) {
			messagesEnd.scrollIntoView({ behavior: 'smooth' })
		}
	}, [messages])

	const handleLogin = () => {
		axios
			.post('https://chat-app-server-cp5l.onrender.com/login', {
				name: loginName.trim(),
				password: loginPassword.trim(),
			})
			.then(() => {
				setSender(loginName.trim())
				setIsLoggedIn(true)
				sessionStorage.setItem('currentUser', loginName.trim())
				setError('')
			})
			.catch(error => setError(error.response?.data?.error || 'Login failed'))
	}

	const handleSignup = () => {
		axios
			.post('https://chat-app-server-cp5l.onrender.com/signup', {
				name: signupName.trim(),
				password: signupPassword.trim(),
			})
			.then(() => {
				setLoginName(signupName.trim())
				setLoginPassword(signupPassword.trim())
				handleLogin()
			})
			.catch(error => setError(error.response?.data?.error || 'Signup failed'))
	}

	const handleLogout = () => {
		setIsLoggedIn(false)
		setSender('')
		setReceiver('')
		setMessages([])
		sessionStorage.removeItem('currentUser')
		sessionStorage.removeItem('currentReceiver')
		socket.disconnect()
	}

	const handleReceiverChange = value => {
		setReceiver(value)
		sessionStorage.setItem('currentReceiver', value)
	}

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !sender || !receiver || !isLoggedIn) return

		try {
			await axios.post('https://chat-app-server-cp5l.onrender.com/messages', {
				sender,
				receiver,
				content: newMessage,
			})
			setNewMessage('')
		} catch (error) {
			console.error('Error sending message:', error)
		}
	}

	const filteredUsers = users.filter(
		user =>
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
			user.name !== sender
	)

	if (!isLoggedIn) {
		return (
			<div className='container'>
				<h1>Messaging App</h1>
				{error && <div className='error'>{error}</div>}
				<input
					type='text'
					placeholder='Username'
					value={loginName}
					onChange={e => setLoginName(e.target.value)}
				/>
				<input
					type='password'
					placeholder='Password'
					value={loginPassword}
					onChange={e => setLoginPassword(e.target.value)}
				/>
				<button onClick={handleLogin}>Kirish</button>

				<h2>Ro'yxatdan o'tish</h2>
				<input
					type='text'
					placeholder='New Username'
					value={signupName}
					onChange={e => setSignupName(e.target.value)}
				/>
				<input
					type='password'
					placeholder='New Password'
					value={signupPassword}
					onChange={e => setSignupPassword(e.target.value)}
				/>
				<button onClick={handleSignup}>Ro'yxatdan o'tish</button>
			</div>
		)
	}

	return (
		<div className='container'>
			<h1>Messaging App</h1>
			<h2>Profile: {sender}</h2>
			<button onClick={handleLogout} className='logout-button'>
				Chiqish
			</button>

			<input
				type='text'
				placeholder='Search user...'
				value={searchQuery}
				onChange={e => setSearchQuery(e.target.value)}
			/>

			<select
				value={receiver}
				onChange={e => handleReceiverChange(e.target.value)}
			>
				<option value=''>Select user</option>
				{filteredUsers.map(user => (
					<option key={user.id} value={user.name}>
						{user.name}
					</option>
				))}
			</select>

			<div className='message-form'>
				<textarea
					value={newMessage}
					onChange={e => setNewMessage(e.target.value)}
					placeholder='Write a message...'
					rows='3'
				></textarea>
				<button onClick={handleSendMessage}>Send</button>
			</div>

			<div className='messages'>
				{messages.map((msg, index) => (
					<div
						key={msg._id || index}
						className={`message ${msg.sender === sender ? 'sent' : 'received'}`}
					>
						<div className='meta'>
							{msg.sender} to {msg.receiver}
						</div>
						<div className='content'>
							<p>{msg.content}</p>
						</div>
						<div className='timestamp'>
							{new Date(msg.createdAt).toLocaleString()}
						</div>
					</div>
				))}
				<div id='messagesEnd' />
			</div>
		</div>
	)
}

export default App
